from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class AttributeSchema(BaseModel):
    name: str
    value: str
    uom: Optional[str] = None
    confidence: float = 1.0
    source: str = "ai"
    source_url: Optional[str] = None
    validation_status: str = "PASS"  # PASS, FAIL, NEEDS_REVIEW
    validation_reason: Optional[str] = None

class ValidationResultSchema(BaseModel):
    field_name: str
    value: Any
    validation_type: str
    status: str  # PASS, FAIL, NEEDS_REVIEW
    confidence: float = 1.0
    reason: Optional[str] = None

class ProductEnrichmentSummary(BaseModel):
    manufacturer: Optional[str] = None
    brand: Optional[str] = None
    department: Optional[str] = None
    class_name: Optional[str] = Field(default=None, alias="class")
    category: Optional[str] = None
    confidence_score: float = 0.0
    status: str = "RAW"
    source_url: Optional[str] = None
    source_type: Optional[str] = None  # "manufacturer", "fallback", "none"
    grounding_sources: List[str] = []
    found: Optional[bool] = None

class ProductDetailResponse(BaseModel):
    id: int
    mfg_part_num: str
    raw_description: str
    raw_brand_e1: Optional[str] = None
    raw_brand_unilog: Optional[str] = None
    raw_brand_dib: Optional[str] = None
    raw_manufacturer: Optional[str] = None
    status: str = "RAW"
    source_url: Optional[str] = None
    source_type: Optional[str] = None
    grounding_sources: List[str] = []
    found: Optional[bool] = None
    enrichment: ProductEnrichmentSummary
    attributes: List[AttributeSchema] = []
    descriptions: Dict[str, str] = {}
    validation_results: List[ValidationResultSchema] = []

class ProductListItem(BaseModel):
    id: int
    mfg_part_num: str
    raw_description: str
    brand: Optional[str] = None
    manufacturer: Optional[str] = None
    category: Optional[str] = None
    confidence_score: float = 0.0
    status: str = "RAW"
    source_url: Optional[str] = None
    source_type: Optional[str] = None
    grounding_sources: List[str] = []
    found: Optional[bool] = None

class ProductListResponse(BaseModel):
    total: int
    page: int
    limit: int
    items: List[ProductListItem]
