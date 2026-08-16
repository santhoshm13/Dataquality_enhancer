import os
import glob
import pandas as pd
from sqlalchemy.orm import sessionmaker
from app.database.models import MasterManufacturerBrand
from scripts.db_helper import get_engine, init_db

PLACEHOLDER_BRANDS = {
    "-- unbranded --", "-- no unilog brand --", "-- no dib brand --",
    "-- no brand --", "unbranded", "no brand", "none", "n/a", "null", "nan"
}

def clean_value(val):
    if val is None or pd.isna(val):
        return None
    s = str(val).strip()
    if not s:
        return None
    return s

def clean_brand(val):
    s = clean_value(val)
    if not s:
        return None
    if s.lower() in PLACEHOLDER_BRANDS:
        return None
    return s

def find_file(filename_pattern):
    candidates = [
        f"data/master/{filename_pattern}",
        f"data/{filename_pattern}",
        f"data/master/*{filename_pattern}*",
        f"data/*{filename_pattern}*"
    ]
    for c in candidates:
        matches = glob.glob(c)
        if matches:
            return matches[0]
    return None

def ingest_manufacturer_brands(engine=None):
    if engine is None:
        engine = get_engine()
    init_db(engine)

    filepath = find_file("UniCat_Manufacturer_and_Brand_List.xlsx")
    if not filepath or not os.path.exists(filepath):
        print(f"[ingest_manufacturer_brands] File not found: {filepath}")
        return 0

    xls = pd.ExcelFile(filepath)
    records = []

    # Case 1: Separate Manufacturers and Brands sheets
    if "Manufacturers" in xls.sheet_names and "Brands" in xls.sheet_names:
        mfg_df = pd.read_excel(xls, sheet_name="Manufacturers")
        brand_df = pd.read_excel(xls, sheet_name="Brands")

        # Map manufacturer code/id
        mfg_map = {}
        for _, row in mfg_df.iterrows():
            m_name = clean_value(row.get("Canonical Manufacturer Name") or row.get("MANUFACTURER_NAME") or row.get("Manufacturer Name"))
            m_code = clean_value(row.get("Manufacturer ID") or row.get("MANUFACTURER_CODE"))
            if m_name:
                mfg_map[m_name] = m_code
                records.append({
                    "manufacturer_name": m_name,
                    "manufacturer_code": m_code,
                    "brand_name": None,
                    "brand_code": None,
                    "status": clean_value(row.get("Status")) or "ACTIVE"
                })

        for _, row in brand_df.iterrows():
            b_name = clean_brand(row.get("Canonical Brand Name") or row.get("BRAND_NAME") or row.get("Brand Name"))
            b_code = clean_value(row.get("Brand ID") or row.get("BRAND_CODE"))
            m_name = clean_value(row.get("Manufacturer Name") or row.get("MANUFACTURER_NAME"))
            m_code = mfg_map.get(m_name) if m_name else None

            if m_name or b_name:
                records.append({
                    "manufacturer_name": m_name or "Unknown",
                    "manufacturer_code": m_code,
                    "brand_name": b_name,
                    "brand_code": b_code,
                    "status": clean_value(row.get("Status")) or "ACTIVE"
                })

    else:
        # Case 2: Unified sheet
        df = pd.read_excel(xls, sheet_name=0)
        for _, row in df.iterrows():
            m_name = clean_value(row.get("MANUFACTURER_NAME") or row.get("Canonical Manufacturer Name") or row.get("Manufacturer Name"))
            m_code = clean_value(row.get("MANUFACTURER_CODE") or row.get("Manufacturer ID"))
            b_name = clean_brand(row.get("BRAND_NAME") or row.get("Canonical Brand Name") or row.get("Brand Name"))
            b_code = clean_value(row.get("BRAND_CODE") or row.get("Brand ID"))

            if m_name or b_name:
                records.append({
                    "manufacturer_name": m_name or "Unknown",
                    "manufacturer_code": m_code,
                    "brand_name": b_name,
                    "brand_code": b_code,
                    "status": clean_value(row.get("Status")) or "ACTIVE"
                })

    Session = sessionmaker(bind=engine)
    session = Session()
    try:
        session.query(MasterManufacturerBrand).delete()
        session.commit()

        batch = [MasterManufacturerBrand(**rec) for rec in records]
        session.bulk_save_objects(batch)
        session.commit()
        count = len(records)
        print(f"[ingest_manufacturer_brands] Successfully loaded {count} rows into master_manufacturers_brands.")
        return count
    except Exception as e:
        session.rollback()
        print(f"[ingest_manufacturer_brands] Error during insertion: {e}")
        raise
    finally:
        session.close()

if __name__ == "__main__":
    ingest_manufacturer_brands()
