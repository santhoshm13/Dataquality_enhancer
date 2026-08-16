import re
import logging
from typing import Dict, Any, Optional
from scripts.db_helper import get_engine
from sqlalchemy.orm import sessionmaker
from app.database.models import MasterUOMStandard

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
    "VOLT": {"code": "V", "name": "Volts", "abbrev": "V", "category": "Electrical"},
    "VOLTS": {"code": "V", "name": "Volts", "abbrev": "V", "category": "Electrical"},
    "A": {"code": "A", "name": "Amperes", "abbrev": "A", "category": "Electrical"},
    "AMPS": {"code": "A", "name": "Amperes", "abbrev": "A", "category": "Electrical"}
}

class UOMService:
    def __init__(self):
        self._uom_cache = {}
        self._valid_uoms = set()
        self._loaded = False

    def load_uoms(self):
        if self._loaded:
            return
        
        try:
            engine = get_engine()
            Session = sessionmaker(bind=engine)
            session = Session()
            db_rows = session.query(MasterUOMStandard).all()
            
            for r in db_rows:
                code_norm = r.uom_code.strip().lower() if r.uom_code else ""
                abbrev_norm = r.standard_abbreviation.strip().lower() if r.standard_abbreviation else ""
                abbrev = r.standard_abbreviation.strip() if r.standard_abbreviation else r.uom_code
                
                if code_norm:
                    self._uom_cache[code_norm] = abbrev
                    self._valid_uoms.add(code_norm)
                if abbrev_norm:
                    self._uom_cache[abbrev_norm] = abbrev
                    self._valid_uoms.add(abbrev_norm)
                    
            session.close()
            self._loaded = True
        except Exception as e:
            logger.warning(f"Could not load UOMs from DB: {e}")
            # Ensure fallbacks are available if DB fails
            for k, v in DEFAULT_UOM_MAP.items():
                self._uom_cache[k.lower()] = v["abbrev"]
                self._valid_uoms.add(k.lower())
                self._valid_uoms.add(v["abbrev"].lower())
            self._loaded = True

    def normalize_uom(self, uom_str: str) -> str:
        """
        Normalizes a UOM string.
        """
        if not uom_str:
            return ""

        clean_uom = str(uom_str).strip()
        norm_key = clean_uom.lower()

        self.load_uoms()

        if norm_key in self._uom_cache:
            return self._uom_cache[norm_key]

        # Query fallback dictionary just in case
        upper_key = clean_uom.upper()
        if upper_key in DEFAULT_UOM_MAP:
            return DEFAULT_UOM_MAP[upper_key]["abbrev"]

        return clean_uom

    def is_valid_uom(self, uom_str: str) -> bool:
        if not uom_str:
            return True
        clean_uom = str(uom_str).strip()
        
        self.load_uoms()
        
        if clean_uom.lower() in self._valid_uoms:
            return True
        return clean_uom.upper() in DEFAULT_UOM_MAP

    def format_value_with_uom(self, value: str, uom_str: str) -> str:
        norm_val = str(value).strip()
        norm_uom = self.normalize_uom(uom_str)
        if not norm_uom:
            return norm_val
        return f"{norm_val} {norm_uom}"

uom_service = UOMService()
