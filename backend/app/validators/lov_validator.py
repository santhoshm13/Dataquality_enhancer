import logging
from typing import Dict, Any, List, Tuple
from rapidfuzz import fuzz

logger = logging.getLogger("app.validators")

from app.services.master_data.uom_service import uom_service
from app.services.lov.lov_retrieval_service import get_lov_for_classpath

class LOVValidator:
    def validate_attribute(self, category: str, attr_name: str, attr_value: str, attr_uom: str = None, classpath: str = "", fuzzy_threshold: int = 85) -> Dict[str, Any]:
        norm_value = str(attr_value).strip() if attr_value else ""
        norm_uom = uom_service.normalize_uom(attr_uom) if attr_uom else ""

        result = {
            "attribute_name": attr_name,
            "name": attr_name,
            "generated_value": attr_value,
            "normalized_value": norm_value,
            "approved_value": norm_value,
            "value": norm_value,
            "uom": norm_uom,
            "validation_status": "PASS",
            "confidence": 1.0,
            "reason": "Validated against LOV & UOM dictionary",
            "validation_reason": "Validated against LOV & UOM dictionary"
        }

        # 1. Check UOM validity if UOM is present
        if attr_uom and not uom_service.is_valid_uom(attr_uom):
            result["validation_status"] = "NEEDS_REVIEW"
            result["confidence"] = 0.60
            result["reason"] = f"Unrecognized Unit of Measure '{attr_uom}'"
            result["validation_reason"] = f"Unrecognized Unit of Measure '{attr_uom}'"
            
        if not norm_value:
            return result

        # 2. Dynamic LOV Lookup from get_lov_for_classpath
        lov_entries = get_lov_for_classpath(classpath)
        
        attr_key = attr_name.strip().lower()
        allowed_set = set()
        
        for entry in lov_entries:
            if entry.attribute_label.strip().lower() == attr_key:
                if entry.normalized_values:
                    # split by comma, assuming comma separated
                    vals = [v.strip().lower() for v in entry.normalized_values.split(",")]
                    allowed_set.update(vals)
                break

        if not allowed_set:
            # If attribute has no LOV restriction, pass
            return result

        # 3. Exact match
        if norm_value.lower() in allowed_set:
            # Get original casing if we want to, but normalized_values are already lowercase.
            # Let's keep it as they typed if exact match.
            return result
            
        # 4. Fuzzy match
        best_match = None
        best_score = 0.0
        
        for allowed_val in allowed_set:
            score = fuzz.token_set_ratio(norm_value.lower(), allowed_val)
            if score > best_score:
                best_score = score
                best_match = allowed_val
                
        if best_match and best_score >= fuzzy_threshold:
            result["validation_status"] = "PASS"
            result["confidence"] = round(best_score / 100.0, 2)
            result["approved_value"] = best_match # Might be lowercase, but it's matched
            result["value"] = best_match
            result["reason"] = f"Fuzzy matched to '{best_match}' (score: {best_score})"
            result["validation_reason"] = f"Fuzzy matched to '{best_match}' (score: {best_score})"
        else:
            result["validation_status"] = "NEEDS_REVIEW"
            result["confidence"] = round(best_score / 100.0, 2) if best_match else 0.0
            result["approved_value"] = ""
            result["reason"] = f"Value '{attr_value}' not in approved LOV. Closest: '{best_match}' ({best_score})"
            result["validation_reason"] = f"Value '{attr_value}' not in approved LOV. Closest: '{best_match}' ({best_score})"

        return result

    def is_valid_uom(self, uom: str) -> bool:
        return uom_service.is_valid_uom(uom)

    def normalize_uom(self, uom: str) -> str:
        return uom_service.normalize_uom(uom)

lov_validator = LOVValidator()
