from typing import List, Optional, Dict, Any
from pydantic import BaseModel

class BrandMatchRequest(BaseModel):
    raw_manufacturer: str
    raw_brand: Optional[str] = None

class BrandMatchResponse(BaseModel):
    raw_value: str
    matched_manufacturer: str
    matched_brand: str
    confidence: float
    method: str  # exact, normalized, fuzzy, ai
    status: str  # PASS, NEEDS_REVIEW

class EnrichmentRequest(BaseModel):
    product_id: int
    force_reprocess: bool = False

class EnrichmentResponse(BaseModel):
    product_id: int
    mfg_part_num: str
    status: str
    confidence_score: float
    manufacturer: str
    brand: str
    category: str
    attributes_count: int
    validation_status: str
