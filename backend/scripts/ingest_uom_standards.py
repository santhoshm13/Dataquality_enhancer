import os
import glob
import pandas as pd
from sqlalchemy.orm import sessionmaker
from app.database.models import MasterUOMStandard, MasterHouseStyleRule
from scripts.db_helper import get_engine, init_db

def clean_value(val):
    if val is None or pd.isna(val):
        return None
    s = str(val).strip()
    if not s:
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

def ingest_uom_standards(engine=None):
    if engine is None:
        engine = get_engine()
    init_db(engine)

    filepath = find_file("Unilog_Master_UOM_Standards_Abbreviations_and_Terms.xlsx")
    if not filepath or not os.path.exists(filepath):
        print(f"[ingest_uom_standards] File not found: {filepath}")
        return (0, 0)

    xls = pd.ExcelFile(filepath)
    uom_records = []
    rule_records = []

    # Sheet 1: UOM Standards
    sheet1_name = xls.sheet_names[0]
    df1 = pd.read_excel(xls, sheet_name=sheet1_name)
    for _, row in df1.iterrows():
        code = clean_value(row.get("UOM Code") or row.get("Code") or row.get("UOM"))
        name = clean_value(row.get("UOM Name") or row.get("Name"))
        abbr = clean_value(row.get("Standard Abbreviation") or row.get("Abbreviation") or row.get("Std Abbr"))
        cat = clean_value(row.get("Category") or row.get("Measurement Type") or row.get("Type"))
        if code or abbr or name:
            uom_records.append({
                "uom_code": code or abbr or "N/A",
                "uom_name": name,
                "standard_abbreviation": abbr or code,
                "category": cat
            })

    # Sheet 2: House Style Rules (if exists)
    if len(xls.sheet_names) > 1:
        sheet2_name = xls.sheet_names[1]
        df2 = pd.read_excel(xls, sheet_name=sheet2_name)
        for _, row in df2.iterrows():
            r_name = clean_value(row.get("Rule Name") or row.get("Term") or row.get("Rule ID") or row.get("Rule"))
            cat = clean_value(row.get("Category") or row.get("Type"))
            guide = clean_value(row.get("Guideline") or row.get("Description") or row.get("House Style Guideline") or row.get("House Style"))
            if r_name or guide:
                rule_records.append({
                    "rule_name": r_name or "General Rule",
                    "category": cat,
                    "guideline": guide
                })

    Session = sessionmaker(bind=engine)
    session = Session()
    try:
        session.query(MasterUOMStandard).delete()
        session.query(MasterHouseStyleRule).delete()
        session.commit()

        uom_batch = [MasterUOMStandard(**rec) for rec in uom_records]
        session.bulk_save_objects(uom_batch)

        rule_batch = [MasterHouseStyleRule(**rec) for rec in rule_records]
        session.bulk_save_objects(rule_batch)

        session.commit()
        uom_count = len(uom_records)
        rule_count = len(rule_records)
        print(f"[ingest_uom_standards] Successfully loaded {uom_count} UOM standards and {rule_count} house-style rules.")
        return (uom_count, rule_count)
    except Exception as e:
        session.rollback()
        print(f"[ingest_uom_standards] Error during insertion: {e}")
        raise
    finally:
        session.close()

if __name__ == "__main__":
    ingest_uom_standards()
