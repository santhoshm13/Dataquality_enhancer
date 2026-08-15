import logging
from typing import Dict, Any, List
from app.services.matching.brand_matching import brand_matcher
from app.services.classification.category_classifier import classifier
from app.services.llm.provider import LLMService
from app.validators.lov_validator import lov_validator
from app.services.master_data.uom_service import uom_service
from app.services.master_data.fraction_service import fraction_service
from app.services.llm.description_generator import description_generator
from app.services.confidence_engine import confidence_engine
from app.config.settings import settings

logger = logging.getLogger("app.pipeline")

class ProductEnrichmentPipeline:
    def __init__(self):
        self.llm_service = LLMService(provider_name=settings.LLM_PROVIDER, api_key=settings.LLM_API_KEY)

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
        brand_match = brand_matcher.match_brand(raw_brands, product_desc=raw_desc)

        # Stage 2: Category Classification Service
        class_res = classifier.classify(raw_desc, mfg_part_num=part_num, manufacturer=mfg_match["matched_value"])

        # Stage 3: Structured AI Attribute Extraction
        extracted_data = await self.llm_service.extract_attributes(
            product_desc=raw_desc,
            category=class_res["category"],
            part_num=part_num
        )

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
                attr_uom=attr_uom
            )
            validated_attributes.append(val_res)

        # Stage 5: Confidence Calculation & Review Routing
        overall_confidence, pipeline_status, review_reasons = confidence_engine.calculate_confidence(
            mfg_match=mfg_match,
            brand_match=brand_match,
            class_res=class_res,
            validated_attributes=validated_attributes
        )

        # Stage 6: Fact-Grounded Description Generation
        descriptions = description_generator.generate_fact_grounded_descriptions(
            mfg_part_num=part_num,
            brand=brand_match["matched_value"],
            manufacturer=mfg_match["matched_value"],
            category=class_res["category"],
            validated_attributes=validated_attributes,
            raw_description=raw_desc
        )

        # Compile final enriched product object
        enriched_product = {
            **product,
            "status": pipeline_status,
            "enrichment": {
                "manufacturer": mfg_match["matched_value"],
                "brand": brand_match["matched_value"],
                "department": class_res["department"],
                "class": class_res["class"],
                "category": class_res["category"],
                "classpath": class_res["classpath"],
                "confidence_score": overall_confidence,
                "status": pipeline_status,
                "review_reasons": review_reasons
            },
            "attributes": validated_attributes,
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
