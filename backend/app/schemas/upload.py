from typing import List, Dict, Any
from pydantic import BaseModel

class CSVUploadPreviewRow(BaseModel):
    mfg_part_num: str
    part_desc: str
    e1_brand: str
    unilog_brand: str
    dib_brand: str
    part_manuf: str

class CSVUploadResponse(BaseModel):
    message: str
    dataset_id: int
    filename: str
    total_rows: int
    imported_count: int
    failed_count: int
    preview_rows: List[CSVUploadPreviewRow] = []
    errors: List[Dict[str, Any]] = []
