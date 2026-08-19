import logging
from typing import Dict, Any
from rapidfuzz import fuzz
from app.services.master_data.uom_service import uom_service
from app.services.master_data.fraction_service import fraction_service
from app.services.lov.lov_retrieval_service import get_lov_for_classpath

logger = logging.getLogger("app.validators")

class LOVValidator:
    def validate_attribute(self, category: str, attr_name: str, attr_value: str, attr_uom: str = None, classpath: str = "", fuzzy_threshold: int = 85) -> Dict[str, Any]:
        # Normalize raw value and UOM
        norm_value = str(attr_value).strip() if attr_value is not None else ""
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
                    vals = [v.strip().lower() for v in entry.normalized_values.split(",") if v.strip()]
                    allowed_set.update(vals)
                break

        # 3. If attribute has NO LOV-constrained value set (free continuous numeric field):
        if not allowed_set:
            # Check if UOM measurement type is "Dimension" (or "in" / "ft")
            if norm_uom and uom_service.is_dimension_uom(norm_uom):
                try:
                    decimal_val = float(norm_value)
                    fraction_repr = fraction_service.decimal_to_fraction(decimal_val)
                    if fraction_repr:
                        converted_val = f"{fraction_repr} {norm_uom}"
                        result["normalized_value"] = converted_val
                        result["approved_value"] = converted_val
                        result["value"] = converted_val
                except (ValueError, TypeError):
                    pass
            return result

        # 4. If attribute IS LOV-constrained:
        # Do NOT auto-convert to fraction. Use exact and fuzzy match against allowed_set as-is.

        # Exact match
        if norm_value.lower() in allowed_set:
            return result

        # Fuzzy match against allowed_set
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
            result["approved_value"] = best_match
            result["value"] = best_match
            result["reason"] = f"Fuzzy matched to '{best_match}' (score: {best_score})"
            result["validation_reason"] = f"Fuzzy matched to '{best_match}' (score: {best_score})"
        else:
            # No match meets threshold – capture best guess for review
            if best_match:
                result["validation_status"] = "NEEDS_REVIEW"
                result["confidence"] = round(best_score / 100.0, 2)
                result["approved_value"] = ""
                result["value"] = ""
                result["reason"] = f"Value '{attr_value}' not in approved LOV. Closest: '{best_match}' ({best_score})"
                result["validation_reason"] = f"Value '{attr_value}' not in approved LOV. Closest: '{best_match}' ({best_score})"
            else:
                result["validation_status"] = "NEEDS_REVIEW"
                result["confidence"] = 0.0
                result["approved_value"] = ""
                result["value"] = ""
                result["reason"] = f"Value '{attr_value}' not in approved LOV."
                result["validation_reason"] = f"Value '{attr_value}' not in approved LOV."

        return result

    def is_valid_uom(self, uom: str) -> bool:
        return uom_service.is_valid_uom(uom)

    def normalize_uom(self, uom: str) -> str:
        return uom_service.normalize_uom(uom)

lov_validator = LOVValidator()
