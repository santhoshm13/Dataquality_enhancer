import logging
from typing import Dict, Any, List, Tuple

logger = logging.getLogger("app.validators")

# Standard LOV dictionary per category and attribute name
STANDARD_LOV_RULES = {
    "Built-In Dishwashers": {
        "Finish": ["Stainless Steel", "Matte Black", "White", "Chrome", "Black Stainless"],
        "Voltage Rating": ["120", "240"],
        "Amperage Rating": ["10", "15", "20"],
        "Mounting Type": ["Leg", "Built-in", "Under Counter"],
        "Number of Wash Cycles": ["3", "4", "5", "6"]
    },
    "Sanding Belts": {
        "Grit": ["P80", "P120", "P150", "P180", "P220", "P320"],
        "Abrasive Material": ["Aluminum Oxide", "Zirconia Alumina", "Ceramic"],
        "Backing Weight": ["X-Weight", "J-Weight", "Y-Weight"]
    }
}

# Standard UOM Normalization Map
UOM_NORMALIZATION_MAP = {
    "VOLTS": "V",
    "VOLT": "V",
    "V": "V",
    "AMPS": "A",
    "AMP": "A",
    "A": "A",
    "INCHES": "in",
    "INCH": "in",
    "IN": "in",
    "\"": "in",
    "DBA": "dBA",
    "DB": "dBA",
    "PIECES": "pc",
    "PCS": "pc",
    "PC": "pc"
}

from app.database.master_data_repository import master_repository
from app.services.master_data.uom_service import uom_service

class LOVValidator:
    def validate_attribute(self, category: str, attr_name: str, attr_value: str, attr_uom: str = None) -> Dict[str, Any]:
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

        # 2. Dynamic LOV Lookup from master_repository
        cat_key = category.strip().lower() if category else ""
        attr_key = attr_name.strip().lower() if attr_name else ""

        allowed_set = None
        if cat_key in master_repository.category_lovs and attr_key in master_repository.category_lovs[cat_key]:
            allowed_set = master_repository.category_lovs[cat_key][attr_key]
        elif category in STANDARD_LOV_RULES and attr_name in STANDARD_LOV_RULES[category]:
            allowed_set = {v.lower() for v in STANDARD_LOV_RULES[category][attr_name]}

        if allowed_set:
            if norm_value.lower() not in allowed_set:
                result["validation_status"] = "FAIL"
                result["confidence"] = 0.0
                result["approved_value"] = ""
                result["reason"] = f"Value '{attr_value}' is not present in approved LOV list."
                result["validation_reason"] = f"Value '{attr_value}' is not present in approved LOV list."

        return result

    def is_valid_uom(self, uom: str) -> bool:
        return uom_service.is_valid_uom(uom)

    def normalize_uom(self, uom: str) -> str:
        return uom_service.normalize_uom(uom)

lov_validator = LOVValidator()

