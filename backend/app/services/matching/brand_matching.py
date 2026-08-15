import re
import logging
from typing import Dict, Any, List
from rapidfuzz import fuzz, process

logger = logging.getLogger("app.services.matching")

# Pre-defined master catalogs for manufacturers and brands
MASTER_MANUFACTURERS = [
    "Rheem Manufacturing",
    "Whirlpool Corporation",
    "Freud Inc",
    "Mirka Abrasives Inc",
    "Jam Industrial Supply LLC",
    "Appliance Dealers Cooperative",
    "3M Company",
    "Bosch Tool Corporation",
    "Milwaukee Electric Tool"
]

MASTER_BRANDS = [
    "FRIGIDAIRE®",
    "Whirlpool®",
    "Diablo",
    "3M",
    "Mirka",
    "Bosch",
    "Milwaukee",
    "DeWalt"
]

def clean_string(val: str) -> str:
    if not val:
        return ""
    # Strip internal vendor codes in parentheses e.g. "Freud Inc (2435)" -> "Freud Inc"
    val = re.sub(r'\s*\([^)]*\)', '', val)
    # Strip common placeholder tags
    val = re.sub(r'--\s*(Unbranded|No Unilog Brand|No DIB Brand)\s*--', '', val, flags=re.IGNORECASE)
    return val.strip()

def normalize(val: str) -> str:
    cleaned = clean_string(val)
    # Lowercase & remove non-alphanumeric except spaces
    cleaned = re.sub(r'[^\w\s]', '', cleaned.lower())
    return ' '.join(cleaned.split())

from app.database.master_data_repository import master_repository

class BrandMatchingService:
    def __init__(self, master_mfg: List[str] = None, master_brands: List[str] = None):
        self._custom_mfg = master_mfg
        self._custom_brands = master_brands

    @property
    def master_mfg(self) -> List[str]:
        if self._custom_mfg:
            return self._custom_mfg
        # Dynamic query from master_repository if populated
        if master_repository.manufacturers:
            return [m["canonical_name"] for m in master_repository.manufacturers.values()]
        return MASTER_MANUFACTURERS

    @property
    def master_brands(self) -> List[str]:
        if self._custom_brands:
            return self._custom_brands
        # Dynamic query from master_repository if populated
        if master_repository.brands:
            return [b["canonical_name"] for b in master_repository.brands.values()]
        return MASTER_BRANDS


    def match_manufacturer(self, raw_mfg: str) -> Dict[str, Any]:
        cleaned_raw = clean_string(raw_mfg)
        if not cleaned_raw:
            return {
                "raw_value": raw_mfg,
                "matched_value": "Unknown Manufacturer",
                "confidence": 0.0,
                "method": "fallback",
                "status": "NEEDS_REVIEW"
            }

        norm_raw = normalize(cleaned_raw)

        # 1. Exact Match
        for master in self.master_mfg:
            if cleaned_raw == master:
                return {
                    "raw_value": raw_mfg,
                    "matched_value": master,
                    "confidence": 1.0,
                    "method": "exact",
                    "status": "PASS"
                }

        # 2. Normalized Exact Match
        for master in self.master_mfg:
            if norm_raw == normalize(master):
                return {
                    "raw_value": raw_mfg,
                    "matched_value": master,
                    "confidence": 0.98,
                    "method": "normalized_exact",
                    "status": "PASS"
                }

        # 3. Fuzzy Matching using RapidFuzz
        matches = process.extract(norm_raw, [normalize(m) for m in self.master_mfg], scorer=fuzz.WRatio, limit=1)
        if matches:
            best_norm, score, index = matches[0]
            matched_master = self.master_mfg[index]
            confidence = round(score / 100.0, 2)
            
            status = "PASS" if confidence >= 0.75 else "NEEDS_REVIEW"
            return {
                "raw_value": raw_mfg,
                "matched_value": matched_master,
                "confidence": confidence,
                "method": "fuzzy",
                "status": status
            }

        return {
            "raw_value": raw_mfg,
            "matched_value": cleaned_raw,
            "confidence": 0.50,
            "method": "unmatched",
            "status": "NEEDS_REVIEW"
        }

    def match_brand(self, raw_brands: List[str], product_desc: str = "") -> Dict[str, Any]:
        candidates = [clean_string(b) for b in raw_brands if clean_string(b)]
        
        # Also check product description for brand keywords if raw brands are uninformative
        desc_norm = normalize(product_desc)
        for master in self.master_brands:
            m_norm = normalize(master)
            if m_norm in desc_norm:
                candidates.append(master)

        if not candidates:
            return {
                "raw_value": ", ".join(raw_brands),
                "matched_value": "Generic / Unbranded",
                "confidence": 0.50,
                "method": "fallback",
                "status": "NEEDS_REVIEW"
            }

        # Evaluate best match across candidates
        best_match = None
        highest_score = 0.0

        for cand in candidates:
            c_norm = normalize(cand)
            for master in self.master_brands:
                m_norm = normalize(master)
                if c_norm == m_norm:
                    return {
                        "raw_value": cand,
                        "matched_value": master,
                        "confidence": 1.0,
                        "method": "exact",
                        "status": "PASS"
                    }
                
                score = fuzz.WRatio(c_norm, m_norm) / 100.0
                if score > highest_score:
                    highest_score = score
                    best_match = master

        if best_match and highest_score >= 0.70:
            return {
                "raw_value": candidates[0],
                "matched_value": best_match,
                "confidence": round(highest_score, 2),
                "method": "fuzzy",
                "status": "PASS" if highest_score >= 0.80 else "NEEDS_REVIEW"
            }

        return {
            "raw_value": candidates[0] if candidates else "",
            "matched_value": candidates[0] if candidates else "Unbranded",
            "confidence": 0.60,
            "method": "heuristic",
            "status": "NEEDS_REVIEW"
        }

brand_matcher = BrandMatchingService()
