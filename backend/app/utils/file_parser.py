import io
import pandas as pd
from typing import Dict, Any, List, Tuple
from fastapi import HTTPException, status

REQUIRED_INPUT_COLUMNS = [
    "Mfg_Part_Num",
    "Part_Desc",
    "E1_Brand",
    "Unilog_Brand",
    "DIB_Brand",
    "Part_Manuf"
]

def clean_placeholder(val: str) -> str:
    """
    Strips vendor placeholder text while retaining real brand or manufacturer text.
    """
    if not val:
        return ""
    import re
    cleaned = re.sub(r'--\s*(Unbranded|No Unilog Brand|No DIB Brand)\s*--', '', str(val), flags=re.IGNORECASE).strip()
    return cleaned

def parse_file_to_dataframe(file_bytes: bytes, filename: str) -> Tuple[pd.DataFrame, List[Dict[str, Any]]]:
    """
    Parses CSV, XLSX, or XLS files using Pandas into a normalized internal DataFrame representation.
    Validates required input columns and returns (df, errors).
    """
    ext = filename.lower().split(".")[-1]
    errors = []

    try:
        if ext == "csv":
            df = pd.read_csv(io.BytesIO(file_bytes), dtype=str, keep_default_na=False)
        elif ext in ["xlsx", "xls"]:
            engine = "openpyxl" if ext == "xlsx" else "xlrd"
            df = pd.read_excel(io.BytesIO(file_bytes), dtype=str, keep_default_na=False, engine=engine)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file extension '.{ext}'. Supported formats: .csv, .xlsx, .xls"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to parse {filename}: {str(e)}"
        )

    # Clean column names (strip whitespace)
    df.columns = [str(c).strip() for c in df.columns]

    # Validate required columns
    missing_cols = [c for c in REQUIRED_INPUT_COLUMNS if c not in df.columns]
    if missing_cols:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Uploaded file is missing required columns: {missing_cols}. Found columns: {list(df.columns)}"
        )

    # Fill NaN with empty string
    df = df.fillna("")

    return df, errors

def normalize_product_record(raw_row: Dict[str, Any], record_id: int) -> Dict[str, Any]:
    """
    Transforms a raw input row into normalized internal product object.
    Preserves all original input fields while offering clean fields.
    """
    return {
        "id": record_id,
        "mfg_part_num": str(raw_row.get("Mfg_Part_Num", "")).strip(),
        "raw_description": str(raw_row.get("Part_Desc", "")).strip(),
        "raw_brand_e1": str(raw_row.get("E1_Brand", "")).strip(),
        "raw_brand_unilog": str(raw_row.get("Unilog_Brand", "")).strip(),
        "raw_brand_dib": str(raw_row.get("DIB_Brand", "")).strip(),
        "raw_manufacturer": str(raw_row.get("Part_Manuf", "")).strip(),
        "clean_brand_e1": clean_placeholder(raw_row.get("E1_Brand", "")),
        "clean_brand_unilog": clean_placeholder(raw_row.get("Unilog_Brand", "")),
        "clean_brand_dib": clean_placeholder(raw_row.get("DIB_Brand", "")),
        "clean_manufacturer": clean_placeholder(raw_row.get("Part_Manuf", "")),
        "status": "UNPROCESSED"
    }

