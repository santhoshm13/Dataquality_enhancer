import logging
from typing import Dict, Any, List
from app.services.matching.brand_matching import brand_matcher, resolve_brand_conflict
from app.services.classification.category_classifier import classifier
from app.services.llm.provider import LLMService
from app.validators.lov_validator import lov_validator
from app.services.master_data.uom_service import uom_service
from app.services.master_data.fraction_service import fraction_service
from app.services.llm.description_generator import description_generator
from app.services.confidence_engine import confidence_engine
from app.services.llm.vision_extractor import extract_visual_attributes, cross_validate_visual_vs_text
from app.config.settings import settings

logger = logging.getLogger("app.pipeline")

_gemini_rate_limited: bool = False

class ProductEnrichmentPipeline:
    def __init__(self):
        self.llm_service = LLMService(provider_name=settings.LLM_PROVIDER, api_key=settings.get_api_key())

    async def run_pipeline(self, product: Dict[str, Any]) -> Dict[str, Any]:
        p_id = product.get("id", 1)
        raw_mfg = product.get("raw_manufacturer", "")
        raw_desc = product.get("raw_description", "")
        part_num = product.get("mfg_part_num", "")
        raw_brands = [
            product.get("raw_brand_e1", ""),
            product.get("raw_brand_unilog", ""),
            product.get("raw_brand_dib", "")
        ]

        # Stage 1: Manufacturer & Brand Matching Engine
        mfg_match = brand_matcher.match_manufacturer(raw_mfg)
        # Multi-source brand conflict resolution: independently match E1, Unilog, DIB
        # then apply precedence rules to resolve conflicts with full source traceability
        brand_match = resolve_brand_conflict(
            e1_brand=product.get("raw_brand_e1", ""),
            unilog_brand=product.get("raw_brand_unilog", ""),
            dib_brand=product.get("raw_brand_dib", ""),
            product_desc=raw_desc
        )

        # Stage 2: Category Classification Service
        class_res = classifier.classify(raw_desc, mfg_part_num=part_num, manufacturer=mfg_match["matched_value"])

        # Stage 3: Structured AI Attribute Extraction
        try:
            extracted_data = await self.llm_service.extract_attributes(
                product_desc=raw_desc,
                category=class_res["category"],
                part_num=part_num,
                classpath=class_res.get("classpath", ""),
                manufacturer=mfg_match["matched_value"],
                brand=brand_match["matched_value"]
            )
        except Exception as e:
            logger.error(f"[Stage 3] extract_attributes failed for MPN={part_num}: {e}")
            extracted_data = {"attributes": [], "department": None, "class": None, "category": None}

        # If LLM returned None dept/class/category, fall back to classifier values
        if not extracted_data.get("department"):
            extracted_data["department"] = class_res.get("department", "")
        if not extracted_data.get("class"):
            extracted_data["class"] = class_res.get("class", "")
        if not extracted_data.get("category"):
            extracted_data["category"] = class_res.get("category", "")

        # Stage 0: Grounded Manufacturer Search & Provenance
        source_url = product.get("source_url")
        source_type = product.get("source_type")
        grounding_sources = product.get("grounding_sources", [])
        found = product.get("found")
        review_status = product.get("review_status")
        review_reason = product.get("review_reason")

        stage_timings = {}
        stage_failed = None
        global _gemini_rate_limited

        # If not already attached, query manufacturer provenance if supported
        if not source_url and hasattr(self.llm_service, "enrich_from_manufacturer") and not _gemini_rate_limited:
            try:
                mfg_for_search = mfg_match["matched_value"] or raw_mfg
                if part_num and mfg_for_search:
                    # Pass category_hint from classification to bias URL search
                    category_hint = class_res.get("category") or class_res.get("class")
                    mfg_enrich = await self.llm_service.enrich_from_manufacturer(
                        mpn=part_num,
                        manufacturer=mfg_for_search,
                        category_hint=category_hint
                    )
                    if mfg_enrich.get("error") and ("429" in str(mfg_enrich["error"]) or "RESOURCE_EXHAUSTED" in str(mfg_enrich["error"])):
                        _gemini_rate_limited = True
                    found = mfg_enrich.get("found", False)
                    source_url = mfg_enrich.get("source_url") or mfg_enrich.get("url")
                    source_type = mfg_enrich.get("source_type", "manufacturer" if found else "none")
                    grounding_sources = mfg_enrich.get("grounding_sources", [])
                    stage_timings = mfg_enrich.get("stage_timings", {})
                    stage_failed = mfg_enrich.get("stage_failed")
                    # Propagate review status from enrichment
                    review_status = mfg_enrich.get("review_status")
                    review_reason = mfg_enrich.get("review_reason")

                    # Stage 3b: extract_full_record — populate all 252 delivery columns
                    # Only runs when we have a successfully scraped page (found=True)
                    full_record = {}
                    if found and source_url and hasattr(self.llm_service, "extract_full_record") and not _gemini_rate_limited:
                        page_text_for_record = mfg_enrich.get("page_text", "") or ""
                        try:
                            full_record = await self.llm_service.extract_full_record(
                                mpn=part_num,
                                manufacturer=mfg_for_search,
                                page_text=page_text_for_record,
                                source_url=source_url
                            )
                            if full_record.get("error") and (
                                "429" in str(full_record["error"]) or
                                "RESOURCE_EXHAUSTED" in str(full_record["error"])
                            ):
                                _gemini_rate_limited = True
                                full_record = {}
                        except Exception as efr:
                            if "429" in str(efr) or "RESOURCE_EXHAUSTED" in str(efr):
                                _gemini_rate_limited = True
                            logger.warning(f"extract_full_record failed for MPN {part_num}: {efr}")
                            full_record = {}
                    product["full_record"] = full_record
            except Exception as e:
                if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                    _gemini_rate_limited = True
                logger.warning(f"Failed manufacturer grounding for MPN {part_num}: {e}")
                found = False
                review_status = "NEEDS_HUMAN_REVIEW"
                review_reason = f"Enrichment exception: {str(e)[:100]}"

        # Normalize found state + build not_found_reason for UI transparency
        not_found_reason: str = ""
        if found is None and source_url:
            found = True
        elif found is None and not source_url:
            found = False
        if found is False:
            not_found_reason = (
                review_reason or
                stage_failed and f"Pipeline stopped at stage: {stage_failed}" or
                "No manufacturer page found for this product. Enrichment uses description text only."
            )

        # Stage 3.5: Vision-Assisted Attribute Extraction (optional, skips gracefully)
        image_url = product.get("image_url") or product.get("Product_Image_URL") or product.get("Image_URL", "")
        vision_result = await extract_visual_attributes(
            image_url=image_url,
            category=class_res["category"],
            classpath=class_res.get("classpath", ""),
            llm_service=self.llm_service
        )
        vision_skipped = vision_result.get("skipped", True)
        vision_skip_reason = vision_result.get("skip_reason", "no_image_url")

        # Stage 4: LOV & UOM & Fraction Validation
        validated_attributes = []
        raw_attrs = extracted_data.get("attributes", [])

        for attr in raw_attrs:
            attr_name = attr.get("name") or attr.get("attribute_name", "")
            attr_val = str(attr.get("value", "")).strip()
            attr_uom = attr.get("uom", "")

            # Apply fraction normalization if applicable
            frac_val = fraction_service.decimal_to_fraction(attr_val)
            norm_val = frac_val if frac_val else attr_val

            # Validate against LOV
            val_res = lov_validator.validate_attribute(
                category=class_res["category"],
                attr_name=attr_name,
                attr_value=norm_val,
                attr_uom=attr_uom,
                classpath=class_res.get("classpath", "")
            )
            # Attach provenance to attribute
            val_res["source"] = "manufacturer_site" if (found and source_url) else "ai_lov_extraction"
            val_res["source_url"] = source_url
            validated_attributes.append(val_res)

        # Stage 4.5: Cross-validate vision attributes against text-derived attributes
        if not vision_skipped and vision_result.get("visual_attributes"):
            validated_attributes = cross_validate_visual_vs_text(
                vision_result["visual_attributes"], validated_attributes
            )

        # Stage 5: Confidence Calculation & Review Routing
        overall_confidence, pipeline_status, review_reasons = confidence_engine.calculate_confidence(
            mfg_match=mfg_match,
            brand_match=brand_match,
            class_res=class_res,
            validated_attributes=validated_attributes,
            found=found,
            review_status=review_status
        )

        # If enrichment flagged NEEDS_HUMAN_REVIEW, ensure pipeline_status reflects it
        if review_status == "NEEDS_HUMAN_REVIEW":
            pipeline_status = "NEEDS_REVIEW"
            if review_reason and review_reason not in review_reasons:
                review_reasons.insert(0, review_reason)

        # Stage 6: Fact-Grounded Description Generation
        descriptions = await description_generator.generate_fact_grounded_descriptions(
            mfg_part_num=part_num,
            brand=brand_match["matched_value"],
            manufacturer=mfg_match["matched_value"],
            category=class_res["category"],
            validated_attributes=validated_attributes,
            raw_description=raw_desc
        )

        # ── Field Provenance: the traceability record for every output field ──
        # Per the hackathon centerpiece: every output field carries
        # {value, source, method, confidence, rationale}.
        # This powers the "Why this value?" expandable panel in the frontend.

        field_provenance = {
            "MANUFACTURER_NAME": {
                "value": mfg_match["matched_value"],
                "source": "master_data_lookup",
                "method": mfg_match["method"],       # exact / normalized / fuzzy / unmatched
                "confidence": mfg_match["confidence"],
                "rationale": (
                    f"Raw input '{mfg_match.get('raw_value', raw_mfg)}' matched to canonical "
                    f"'{mfg_match['matched_value']}' via {mfg_match['method']} matching "
                    f"(confidence: {round(mfg_match['confidence'] * 100)}%)."
                    if mfg_match["matched_value"]
                    else f"Raw input '{raw_mfg}' did not reach confidence threshold — flagged NEEDS_REVIEW."
                )
            },
            "BRAND_NAME": {
                "value": brand_match["matched_value"],
                "source": "multi_source_brand_resolution",
                "method": brand_match["method"],
                "confidence": brand_match["confidence"],
                "confidence_tier": brand_match.get("confidence_tier", "UNKNOWN"),
                "agreement_count": brand_match.get("agreement_count", 0),
                "conflict": brand_match.get("conflict", False),
                "sources_checked": brand_match.get("sources_checked", ["E1_Brand", "Unilog_Brand", "DIB_Brand"]),
                "source_votes": brand_match.get("source_votes", {}),
                "rationale": brand_match.get("conflict_detail") or (
                    f"Brand candidates resolved to canonical "
                    f"'{brand_match['matched_value']}' via {brand_match['method']} matching "
                    f"(confidence: {round(brand_match['confidence'] * 100)}%)."
                    if brand_match["matched_value"]
                    else f"Brand candidates did not match any master brand — flagged NEEDS_REVIEW."
                )
            },
            "Dept": {
                "value": class_res["department"],
                "source": "category_classifier",
                "method": class_res.get("classification_method", "rule_based"),
                "confidence": class_res.get("confidence", 0.0),
                "rationale": (
                    f"Classified to department '{class_res['department']}' via "
                    f"{class_res.get('classification_method', 'classifier')} "
                    f"(confidence: {round(class_res.get('confidence', 0.0) * 100)}%)."
                )
            },
            "Class": {
                "value": class_res["class"],
                "source": "category_classifier",
                "method": class_res.get("classification_method", "rule_based"),
                "confidence": class_res.get("confidence", 0.0),
                "rationale": f"Class '{class_res['class']}' assigned under dept '{class_res['department']}'."
            },
            "Fine": {
                "value": class_res["category"],
                "source": "category_classifier",
                "method": class_res.get("classification_method", "rule_based"),
                "confidence": class_res.get("confidence", 0.0),
                "rationale": f"Fine category '{class_res['category']}' from classpath '{class_res['classpath']}'."
            },
            "Classpath": {
                "value": class_res["classpath"],
                "source": "category_classifier",
                "method": class_res.get("classification_method", "rule_based"),
                "confidence": class_res.get("confidence", 0.0),
                "rationale": f"Full taxonomy path resolved as '{class_res['classpath']}'."
            },
        }

        # Add provenance for each validated attribute
        attr_provenance = {}
        for attr in validated_attributes:
            attr_name = attr.get("name") or attr.get("attribute_name", "")
            if not attr_name:
                continue
            val_status = attr.get("validation_status", "UNKNOWN")
            method = "llm_extraction"
            if attr.get("source") == "manufacturer_site":
                method = "manufacturer_site_scrape"
            attr_provenance[attr_name] = {
                "value": attr.get("value", ""),
                "uom": attr.get("uom", ""),
                "source": attr.get("source", "ai_lov_extraction"),
                "method": method,
                "confidence": attr.get("confidence", 0.0),
                "validation_status": val_status,
                "rationale": (
                    attr.get("validation_reason") or
                    (f"Extracted from product description via LLM; "
                     f"validated against LOV: {val_status}.")
                ),
                "evidence": attr.get("evidence", "")
            }
        field_provenance["attributes"] = attr_provenance

        # Compile final enriched product object
        enriched_product = {
            **product,
            "status": pipeline_status,
            "source_url": source_url,
            "source_type": source_type or ("manufacturer" if found else "none"),
            "grounding_sources": grounding_sources,
            "found": found,
            "not_found_reason": not_found_reason if not found else "",
            "stage_timings": stage_timings,
            "stage_failed": stage_failed,
            "review_status": review_status,
            "review_reason": review_reason,
            "field_provenance": field_provenance,
            "enrichment": {
                "manufacturer": mfg_match["matched_value"],
                "brand": brand_match["matched_value"],
                "department": class_res["department"],
                "class": class_res["class"],
                "category": class_res["category"],
                "classpath": class_res["classpath"],
                "confidence_score": overall_confidence,
                "status": pipeline_status,
                "source_url": source_url,
                "source_type": source_type or ("manufacturer" if found else "none"),
                "grounding_sources": grounding_sources,
                "found": found,
                "stage_timings": stage_timings,
                "stage_failed": stage_failed,
                "review_status": review_status,
                "review_reason": review_reason,
                "review_reasons": review_reasons
            },
            "attributes": validated_attributes,
            "full_record": product.get("full_record", {}),
            "vision_stage": {
                "skipped": vision_skipped,
                "skip_reason": vision_skip_reason,
                "image_url": vision_result.get("image_url"),
                "visual_attributes_count": len(vision_result.get("visual_attributes", []))
            },
            "descriptions": descriptions,
            "validation_results": [
                {
                    "field_name": "Manufacturer",
                    "value": mfg_match["matched_value"],
                    "validation_type": "matching",
                    "status": mfg_match["status"],
                    "confidence": mfg_match["confidence"],
                    "reason": f"Matched via {mfg_match['method']} engine"
                },
                {
                    "field_name": "Brand",
                    "value": brand_match["matched_value"],
                    "validation_type": "matching",
                    "status": brand_match["status"],
                    "confidence": brand_match["confidence"],
                    "reason": f"Matched via {brand_match['method']} engine"
                }
            ]
        }

        return enriched_product

pipeline_engine = ProductEnrichmentPipeline()
