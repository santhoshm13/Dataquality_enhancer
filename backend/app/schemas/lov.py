from typing import Optional
from pydantic import BaseModel

class LovEntry(BaseModel):
    attribute_label: str
    attribute_values: Optional[str] = None
    normalized_label: Optional[str] = None
    normalized_values: Optional[str] = None
    filtering: Optional[str] = None
    guidelines: Optional[str] = None
    uom_standard: Optional[str] = None
    classpath: str
