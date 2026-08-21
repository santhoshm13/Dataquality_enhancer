"""
Explainable Audit Trail Export Service

Generates per-product provenance reports (JSON and CSV) containing:
- Raw input fields
- Every enriched field with {value, source, method, confidence, rationale}
- Brand conflict detection results
- Vision cross-validation results
- Final delivery-format values

Used by GET /api/export/audit/{product_id} and GET /api/export/audit?dataset_id=N
"""
import csv
import io
import json
from typing import Any, Dict, List, Optional


def generate_audit_report(product: Dict[str, Any]) -> Dict[str, Any]:
    """Generate a structured per-product audit report."""
    p = product
    enrichment = p.get("enrichment", {})
    provenance = p.get("field_provenance", {})
    attrs = p.get("attributes", [])
    vision = p.get("vision_stage", {})

    # Raw input fields
    raw_input = {
        "mfg_part_num": p.get("mfg_part_num", ""),
        "raw_description": p.get("raw_description", ""),
        "raw_manufacturer": p.get("raw_manufacturer", ""),
        "raw_brand_e1": p.get("raw_brand_e1", ""),
        "raw_brand_unilog": p.get("raw_brand_unilog", ""),
        "raw_brand_dib": p.get("raw_brand_dib", ""),
        "image_url": p.get("image_url", "") or p.get("Product_Image_URL", ""),
        "dataset_id": p.get("dataset_id")
    }

    # Brand conflict detail
    brand_prov = provenance.get("BRAND_NAME", {})
    brand_conflict = {
        "resolved_value": brand_prov.get("value"),
        "confidence": brand_prov.get("confidence"),
        "confidence_tier": brand_prov.get("confidence_tier", "UNKNOWN"),
        "agreement_count": brand_prov.get("agreement_count", 0),
        "conflict_detected": brand_prov.get("conflict", False),
        "sources_checked": brand_prov.get("sources_checked", []),
        "source_votes": brand_prov.get("source_votes", {}),
        "rationale": brand_prov.get("rationale", "")
    }

    # Enriched fields with full provenance
    enriched_fields = {}
    for field_name, prov_data in provenance.items():
        if field_name == "attributes":
            continue
        enriched_fields[field_name] = {
            "value": prov_data.get("value"),
            "source": prov_data.get("source"),
            "method": prov_data.get("method"),
            "confidence": prov_data.get("confidence"),
            "rationale": prov_data.get("rationale")
        }

    # Attribute-level provenance
    attr_provenance = provenance.get("attributes", {})
    attribute_audit = []
    for attr in attrs:
        attr_name = attr.get("name") or attr.get("attribute_name", "")
        prov = attr_provenance.get(attr_name, {})
        attribute_audit.append({
            "attribute": attr_name,
            "value": attr.get("value", ""),
            "uom": attr.get("uom", ""),
            "validation_status": attr.get("validation_status", ""),
            "source": attr.get("source", prov.get("source", "")),
            "method": prov.get("method", ""),
            "confidence": attr.get("confidence", prov.get("confidence", 0.0)),
            "rationale": attr.get("rationale", prov.get("rationale", "")),
            "vision_confirmed": attr.get("vision_confirmed", False),
            "vision_conflict": attr.get("vision_conflict", False),
            "vision_value": attr.get("vision_value"),
            "text_value": attr.get("text_value")
        })

    # Final delivery values
    final_delivery = {
        "MANUFACTURER_NAME": enrichment.get("manufacturer"),
        "BRAND_NAME": enrichment.get("brand"),
        "department": enrichment.get("department"),
        "class": enrichment.get("class"),
        "fine_category": enrichment.get("category"),
        "classpath": enrichment.get("classpath"),
        "confidence_score": enrichment.get("confidence_score"),
        "pipeline_status": enrichment.get("status"),
        "descriptions": p.get("descriptions", {})
    }

    return {
        "product_id": p.get("id"),
        "mfg_part_num": p.get("mfg_part_num"),
        "audit_version": "1.0",
        "raw_input": raw_input,
        "brand_conflict_resolution": brand_conflict,
        "enriched_fields": enriched_fields,
        "attribute_audit": attribute_audit,
        "vision_stage": vision,
        "final_delivery": final_delivery,
        "review_reasons": enrichment.get("review_reasons", [])
    }


def generate_audit_csv(products: List[Dict[str, Any]]) -> str:
    """Generate a flattened CSV audit trail for all products."""
    output = io.StringIO()

    fieldnames = [
        "product_id", "mfg_part_num", "raw_description", "raw_manufacturer",
        "raw_brand_e1", "raw_brand_unilog", "raw_brand_dib",
        "resolved_brand", "brand_confidence", "brand_tier", "brand_agreement_count",
        "brand_conflict", "brand_rationale",
        "manufacturer_resolved", "mfg_confidence", "mfg_method",
        "department", "class", "fine_category", "classpath",
        "overall_confidence", "pipeline_status",
        "attributes_count", "vision_skipped", "vision_attributes_count",
        "review_reasons"
    ]

    writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction="ignore")
    writer.writeheader()

    for p in products:
        report = generate_audit_report(p)
        brand = report["brand_conflict_resolution"]
        mfg_prov = report["enriched_fields"].get("MANUFACTURER_NAME", {})
        delivery = report["final_delivery"]
        vision = report["vision_stage"]

        writer.writerow({
            "product_id": report["product_id"],
            "mfg_part_num": report["mfg_part_num"],
            "raw_description": report["raw_input"].get("raw_description", "")[:120],
            "raw_manufacturer": report["raw_input"].get("raw_manufacturer", ""),
            "raw_brand_e1": report["raw_input"].get("raw_brand_e1", ""),
            "raw_brand_unilog": report["raw_input"].get("raw_brand_unilog", ""),
            "raw_brand_dib": report["raw_input"].get("raw_brand_dib", ""),
            "resolved_brand": brand.get("resolved_value", ""),
            "brand_confidence": brand.get("confidence", 0),
            "brand_tier": brand.get("confidence_tier", ""),
            "brand_agreement_count": brand.get("agreement_count", 0),
            "brand_conflict": brand.get("conflict_detected", False),
            "brand_rationale": brand.get("rationale", "")[:200],
            "manufacturer_resolved": mfg_prov.get("value", ""),
            "mfg_confidence": mfg_prov.get("confidence", 0),
            "mfg_method": mfg_prov.get("method", ""),
            "department": delivery.get("department", ""),
            "class": delivery.get("class", ""),
            "fine_category": delivery.get("fine_category", ""),
            "classpath": delivery.get("classpath", ""),
            "overall_confidence": delivery.get("confidence_score", 0),
            "pipeline_status": delivery.get("pipeline_status", ""),
            "attributes_count": len(report["attribute_audit"]),
            "vision_skipped": vision.get("skipped", True),
            "vision_attributes_count": vision.get("visual_attributes_count", 0),
            "review_reasons": "; ".join(report.get("review_reasons", []))
        })

    return output.getvalue()
