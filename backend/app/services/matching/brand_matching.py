import re
import logging
from typing import Dict, Any, List, Optional
from rapidfuzz import fuzz

logger = logging.getLogger("app.services.matching")

PLACEHOLDER_BRANDS = {
    "-- unbranded --", "-- no unilog brand --", "-- no dib brand --",
    "-- no brand --", "unbranded", "no brand", "none", "n/a", "null", "nan", ""
}

CORPORATE_SUFFIX_REGEX = r'\b(inc|incorporated|llc|ltd|limited|corp|corporation|co|company)\b'

# Default fallback master entries if DB is not populated yet
DEFAULT_MASTER_RECORDS = [
    {"manufacturer_name": "Moen Incorporated", "manufacturer_code": "1001", "brand_name": "Moen®", "brand_code": "B001"},
    {"manufacturer_name": "BrassCraft Manufacturing", "manufacturer_code": "1002", "brand_name": "BrassCraft®", "brand_code": "B002"},
    {"manufacturer_name": "Rheem Manufacturing", "manufacturer_code": "1003", "brand_name": "FRIGIDAIRE®", "brand_code": "B003"},
    {"manufacturer_name": "Freud Inc", "manufacturer_code": "1004", "brand_name": "Diablo", "brand_code": "B004"},
    {"manufacturer_name": "Mirka Abrasives Inc", "manufacturer_code": "1005", "brand_name": "Mirka", "brand_code": "B005"},
    {"manufacturer_name": "Whirlpool Corporation", "manufacturer_code": "1006", "brand_name": "Whirlpool®", "brand_code": "B006"},
    {"manufacturer_name": "3M Company", "manufacturer_code": "1007", "brand_name": "3M", "brand_code": "B007"},
    {"manufacturer_name": "Bosch Tool Corporation", "manufacturer_code": "1008", "brand_name": "Bosch", "brand_code": "B008"},
    {"manufacturer_name": "Milwaukee Electric Tool", "manufacturer_code": "1009", "brand_name": "Milwaukee", "brand_code": "B009"},
    {"manufacturer_name": "DeWalt Industrial Tool Co.", "manufacturer_code": "1010", "brand_name": "DeWalt", "brand_code": "B010"}
]

MASTER_MANUFACTURERS = [r["manufacturer_name"] for r in DEFAULT_MASTER_RECORDS]
MASTER_BRANDS = [r["brand_name"] for r in DEFAULT_MASTER_RECORDS if r["brand_name"]]

def is_placeholder(val: Optional[str]) -> bool:
    if val is None:
        return True
    s = str(val).strip()
    if not s or s.lower() in PLACEHOLDER_BRANDS:
        return True
    # Strip pattern like -- Unbranded --
    cleaned = re.sub(r'--\s*(unbranded|no unilog brand|no dib brand|no brand)\s*--', '', s, flags=re.IGNORECASE).strip()
    if not cleaned or cleaned.lower() in PLACEHOLDER_BRANDS:
        return True
    return False

def clean_string(val: Optional[str]) -> str:
    if not val or is_placeholder(val):
        return ""
    s = str(val).strip()
    # Strip internal vendor codes in parentheses e.g. "Freud Inc (2435)" -> "Freud Inc"
    s = re.sub(r'\s*\([^)]*\)', '', s)
    return s.strip()

def normalize_exact(val: str) -> str:
    """Case-insensitive, whitespace-normalized string."""
    s = clean_string(val)
    s = re.sub(r'\s+', ' ', s)
    return s.lower()

def normalize_strict(val: str) -> str:
    """Strips corporate suffixes (Inc, LLC, Ltd), symbols (®, ™), and punctuation."""
    s = clean_string(val)
    s = re.sub(r'[®™]', '', s)
    s = re.sub(r'[^\w\s]', ' ', s.lower())
    s = re.sub(CORPORATE_SUFFIX_REGEX, ' ', s)
    return ' '.join(s.split())

class BrandMatchingService:
    def __init__(self, master_records: Optional[List[Dict[str, Any]]] = None):
        self._custom_records = master_records
        self._cached_records: Optional[List[Dict[str, Any]]] = None

    def get_master_records(self) -> List[Dict[str, Any]]:
        if self._custom_records is not None:
            return self._custom_records

        if self._cached_records is not None:
            return self._cached_records

        # Query database table master_manufacturers_brands if available
        try:
            from scripts.db_helper import get_engine
            from sqlalchemy.orm import sessionmaker
            from app.database.models import MasterManufacturerBrand

            engine = get_engine()
            Session = sessionmaker(bind=engine)
            session = Session()
            db_rows = session.query(MasterManufacturerBrand).all()
            session.close()

            if db_rows:
                records = []
                for r in db_rows:
                    records.append({
                        "manufacturer_name": r.manufacturer_name,
                        "manufacturer_code": r.manufacturer_code,
                        "brand_name": r.brand_name,
                        "brand_code": r.brand_code,
                        "status": r.status
                    })
                self._cached_records = records
                return records
        except Exception as e:
            logger.debug(f"Could not load master_manufacturers_brands from DB: {e}")

        self._cached_records = DEFAULT_MASTER_RECORDS
        return DEFAULT_MASTER_RECORDS

    def match_manufacturer(self, raw_mfg: Optional[str], threshold: int = 90) -> Dict[str, Any]:
        """
        Matches raw manufacturer input against master_manufacturers_brands table using 4-stage priority:
        1. Exact match (case-insensitive, whitespace-normalized)
        2. Normalized match (strips Inc, LLC, ®, ™, punctuation)
        3. RapidFuzz fuzzy match (configurable threshold, default 90)
        4. Threshold failure (flags NEEDS_REVIEW)
        """
        if is_placeholder(raw_mfg):
            return {
                "raw_value": raw_mfg,
                "matched_value": None,
                "confidence": 0.0,
                "method": "placeholder_filtered",
                "status": "NEEDS_REVIEW"
            }

        cleaned = clean_string(raw_mfg)
        records = self.get_master_records()

        norm1 = normalize_exact(cleaned)
        norm2 = normalize_strict(cleaned)

        # Stage 1: Exact Match
        for rec in records:
            mfg_name = rec.get("manufacturer_name")
            if mfg_name and norm1 == normalize_exact(mfg_name):
                return {
                    "raw_value": raw_mfg,
                    "matched_value": mfg_name,
                    "confidence": 1.0,
                    "method": "exact",
                    "status": "PASS"
                }

        # Stage 2: Normalized Match
        for rec in records:
            mfg_name = rec.get("manufacturer_name")
            if mfg_name and norm2 == normalize_strict(mfg_name):
                return {
                    "raw_value": raw_mfg,
                    "matched_value": mfg_name,
                    "confidence": 0.98,
                    "method": "normalized",
                    "status": "PASS"
                }

        # Stage 3: RapidFuzz Fuzzy Match
        best_cand = None
        best_score = 0.0

        for rec in records:
            mfg_name = rec.get("manufacturer_name")
            if not mfg_name:
                continue
            mfg_strict = normalize_strict(mfg_name)
            score = fuzz.token_set_ratio(norm2, mfg_strict)
            if score > best_score:
                best_score = score
                best_cand = mfg_name

        if best_cand and best_score >= threshold:
            return {
                "raw_value": raw_mfg,
                "matched_value": best_cand,
                "confidence": round(best_score / 100.0, 2),
                "method": "fuzzy",
                "status": "PASS"
            }

        # Stage 4: Below Threshold -> NEEDS_REVIEW
        return {
            "raw_value": raw_mfg,
            "matched_value": None,
            "confidence": round(best_score / 100.0, 2) if best_score else 0.0,
            "method": "unmatched",
            "status": "NEEDS_REVIEW"
        }

    def match_brand(self, raw_brand: Any, raw_mfg: Optional[str] = None, threshold: int = 90, product_desc: str = "") -> Dict[str, Any]:
        """
        Matches raw brand input (string or list of string candidates) against master_manufacturers_brands table using 4-stage priority:
        1. Exact match against BRAND_NAME or MANUFACTURER_NAME
        2. Normalized match (strips Inc, LLC, ®, ™, punctuation)
        3. RapidFuzz fuzzy match (configurable threshold, default 90)
        4. Threshold failure (flags NEEDS_REVIEW)

        Client Rule: If a matched manufacturer has no associated brand, use the canonical manufacturer name.
        Always returns exact canonical casing, spacing, and ® / ™ symbols as stored in UniCat.
        """
        records = self.get_master_records()

        # Extract candidate strings from list or single string
        candidates = []
        if isinstance(raw_brand, list):
            for item in raw_brand:
                if not is_placeholder(item):
                    candidates.append(clean_string(item))
        elif not is_placeholder(raw_brand):
            candidates.append(clean_string(raw_brand))

        # Check product_desc for brand keywords if candidates are empty
        if not candidates and product_desc:
            desc_norm = normalize_strict(product_desc)
            for rec in records:
                b_name = rec.get("brand_name")
                m_name = rec.get("manufacturer_name")
                if b_name and not is_placeholder(b_name) and normalize_strict(b_name) in desc_norm:
                    candidates.append(clean_string(b_name))
                    break
                elif m_name and normalize_strict(m_name) in desc_norm:
                    candidates.append(clean_string(m_name))
                    break

        if not candidates:
            return {
                "raw_value": ", ".join([str(b) for b in raw_brand]) if isinstance(raw_brand, list) else raw_brand,
                "matched_value": None,
                "confidence": 0.0,
                "method": "placeholder_filtered",
                "status": "NEEDS_REVIEW"
            }

        # Helper to extract canonical brand according to client rule
        def get_canonical_brand(rec: Dict[str, Any]) -> str:
            b = rec.get("brand_name")
            if b and not is_placeholder(b):
                return b
            return rec.get("manufacturer_name") or ""

        # Check each candidate string against 4-stage priority
        best_overall_match = None
        best_overall_score = 0.0

        for cand in candidates:
            norm1 = normalize_exact(cand)
            norm2 = normalize_strict(cand)

            # Stage 1: Exact Match
            for rec in records:
                b_name = rec.get("brand_name")
                m_name = rec.get("manufacturer_name")
                if b_name and norm1 == normalize_exact(b_name):
                    return {
                        "raw_value": cand,
                        "matched_value": get_canonical_brand(rec),
                        "confidence": 1.0,
                        "method": "exact",
                        "status": "PASS"
                    }
                if m_name and norm1 == normalize_exact(m_name):
                    return {
                        "raw_value": cand,
                        "matched_value": get_canonical_brand(rec),
                        "confidence": 1.0,
                        "method": "exact",
                        "status": "PASS"
                    }

            # Stage 2: Normalized Match
            for rec in records:
                b_name = rec.get("brand_name")
                m_name = rec.get("manufacturer_name")
                if b_name and norm2 == normalize_strict(b_name):
                    return {
                        "raw_value": cand,
                        "matched_value": get_canonical_brand(rec),
                        "confidence": 0.98,
                        "method": "normalized",
                        "status": "PASS"
                    }
                if m_name and norm2 == normalize_strict(m_name):
                    return {
                        "raw_value": cand,
                        "matched_value": get_canonical_brand(rec),
                        "confidence": 0.98,
                        "method": "normalized",
                        "status": "PASS"
                    }

            # Stage 3: RapidFuzz Fuzzy Match
            for rec in records:
                b_name = rec.get("brand_name")
                m_name = rec.get("manufacturer_name")

                if b_name and not is_placeholder(b_name):
                    score_b = fuzz.token_set_ratio(norm2, normalize_strict(b_name))
                    if score_b > best_overall_score:
                        best_overall_score = score_b
                        best_overall_match = get_canonical_brand(rec)

                if m_name:
                    score_m = fuzz.token_set_ratio(norm2, normalize_strict(m_name))
                    if score_m > best_overall_score:
                        best_overall_score = score_m
                        best_overall_match = get_canonical_brand(rec)

        if best_overall_match and best_overall_score >= threshold:
            return {
                "raw_value": candidates[0],
                "matched_value": best_overall_match,
                "confidence": round(best_overall_score / 100.0, 2),
                "method": "fuzzy",
                "status": "PASS"
            }

        # Stage 4: Below Threshold -> NEEDS_REVIEW
        return {
            "raw_value": candidates[0] if candidates else (", ".join([str(b) for b in raw_brand]) if isinstance(raw_brand, list) else raw_brand),
            "matched_value": None,
            "confidence": round(best_overall_score / 100.0, 2) if best_overall_score else 0.0,
            "method": "unmatched",
            "status": "NEEDS_REVIEW"
        }

# Global singleton matcher instance
brand_matcher = BrandMatchingService()
