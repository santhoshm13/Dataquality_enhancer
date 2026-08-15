import re
import logging
from typing import Dict, Any, Optional
from app.database.master_data_repository import master_repository

logger = logging.getLogger("app.services.uom")

# Standard fallback UOM normalization dictionary
DEFAULT_UOM_MAP = {
    "GPM": {"code": "GPM", "name": "Gallons Per Minute", "abbrev": "GPM", "category": "Flow Rate"},
    "PSI": {"code": "PSI", "name": "Pounds per Square Inch", "abbrev": "PSI", "category": "Pressure"},
    "FT": {"code": "FT", "name": "Feet", "abbrev": "ft", "category": "Dimension"},
    "FEET": {"code": "FT", "name": "Feet", "abbrev": "ft", "category": "Dimension"},
    "IN": {"code": "IN", "name": "Inches", "abbrev": "in", "category": "Dimension"},
    "INCH": {"code": "IN", "name": "Inches", "abbrev": "in", "category": "Dimension"},
    "INCHES": {"code": "IN", "name": "Inches", "abbrev": "in", "category": "Dimension"},
    "\"": {"code": "IN", "name": "Inches", "abbrev": "in", "category": "Dimension"},
    "PC": {"code": "PC", "name": "Piece", "abbrev": "pc", "category": "Quantity"},
    "PCS": {"code": "PC", "name": "Piece", "abbrev": "pc", "category": "Quantity"},
    "PIECES": {"code": "PC", "name": "Piece", "abbrev": "pc", "category": "Quantity"},
    "V": {"code": "V", "name": "Volts", "abbrev": "V", "category": "Electrical"},
    "VOLTS": {"code": "V", "name": "Volts", "abbrev": "V", "category": "Electrical"},
    "A": {"code": "A", "name": "Amperes", "abbrev": "A", "category": "Electrical"},
    "AMPS": {"code": "A", "name": "Amperes", "abbrev": "A", "category": "Electrical"}
}

class UOMService:
    def normalize_uom(self, uom_str: str) -> str:
        """
        Normalizes a UOM string using master_repository or standard fallbacks.
        """
        if not uom_str:
            return ""

        clean_uom = str(uom_str).strip()
        norm_key = clean_uom.lower()

        # 1. Query dynamic master_repository
        if master_repository.is_valid_uom(clean_uom):
            rec = master_repository.uom_standards.get(norm_key)
            if rec:
                return rec.get("abbrev", clean_uom)

        # 2. Query fallback dictionary
        upper_key = clean_uom.upper()
        if upper_key in DEFAULT_UOM_MAP:
            return DEFAULT_UOM_MAP[upper_key]["abbrev"]

        return clean_uom

    def is_valid_uom(self, uom_str: str) -> bool:
        if not uom_str:
            return True
        clean_uom = str(uom_str).strip()
        if master_repository.is_valid_uom(clean_uom):
            return True
        return clean_uom.upper() in DEFAULT_UOM_MAP

    def format_value_with_uom(self, value: str, uom_str: str) -> str:
        norm_val = str(value).strip()
        norm_uom = self.normalize_uom(uom_str)
        if not norm_uom:
            return norm_val
        return f"{norm_val} {norm_uom}"

uom_service = UOMService()
