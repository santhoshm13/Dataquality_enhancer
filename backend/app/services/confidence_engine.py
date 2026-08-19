import logging
from typing import Dict, Any, List, Tuple

logger = logging.getLogger("app.services.confidence")

class ConfidenceEngine:
    def calculate_confidence(
        self,
        mfg_match: Dict[str, Any],
        brand_match: Dict[str, Any],
        class_res: Dict[str, Any],
        validated_attributes: List[Dict[str, Any]]
    ) -> Tuple[float, str, List[str]]:
        """
        Calculates holistic confidence score (0.0 to 1.0), pipeline status, and granular reason codes.
        """
        reasons: List[str] = []

        mfg_conf = mfg_match.get("confidence", 0.0)
        brand_conf = brand_match.get("confidence", 0.0)
        cat_conf = class_res.get("confidence", 0.80)

        # Attribute validation score
        attr_failures = 0
        for attr in validated_attributes:
            v_status = attr.get("validation_status")
            if v_status in ["FAIL", "NEEDS_REVIEW"]:
                attr_failures += 1
                r_msg = attr.get("validation_reason") or f"Attribute '{attr.get('name')}' validation failed ({v_status})"
                reasons.append(r_msg)

        if not validated_attributes:
            attr_conf = 1.0
        else:
            attr_conf = max(0.0, 1.0 - (attr_failures / len(validated_attributes)))

        # Weighted confidence calculation
        overall_score = round(
            (mfg_conf * 0.25) + (brand_conf * 0.25) + (cat_conf * 0.20) + (attr_conf * 0.30),
            2
        )

        # Specific reason checks
        if mfg_match.get("status") == "NEEDS_REVIEW":
            reasons.append(f"Manufacturer matching requires review (Score: {mfg_conf})")
        if brand_match.get("status") == "NEEDS_REVIEW":
            reasons.append(f"Brand matching requires review (Score: {brand_conf})")
        if attr_failures > 0:
            reasons.append(f"{attr_failures} attribute(s) failed LOV/UOM validation")

        # Determine pipeline status based on weighted tier aggregation
        core_fields = {"Brand", "Manufacturer", "Classpath"}
        tier_counts = {"HIGH": 0, "MEDIUM": 0, "NEEDS_REVIEW": 0}
        total_weight = 0
        
        # Process each validated attribute to compute tier and weight
        for attr in validated_attributes:
            attr_name = attr.get("name") or attr.get("attribute_name") or ""
            status = attr.get("validation_status")
            confidence = attr.get("confidence", 1.0)
            
            # Map status+confidence to tier
            if status != "PASS":
                tier = "NEEDS_REVIEW"
            elif confidence >= 0.95:
                tier = "HIGH"
            elif confidence >= 0.85:
                tier = "MEDIUM"
            else:
                tier = "NEEDS_REVIEW"
            
            weight = 2 if attr_name in core_fields else 1
            tier_counts[tier] += weight
            total_weight += weight
        
        # Determine overall pipeline status
        if tier_counts["NEEDS_REVIEW"] > 0:
            pipeline_status = "NEEDS_REVIEW"
        elif tier_counts["HIGH"] >= tier_counts["MEDIUM"]:
            pipeline_status = "HIGH"
        else:
            pipeline_status = "MEDIUM"

        if not reasons:
            reasons.append("All automated enrichment checks passed with high confidence.")

        return overall_score, pipeline_status, reasons

confidence_engine = ConfidenceEngine()
