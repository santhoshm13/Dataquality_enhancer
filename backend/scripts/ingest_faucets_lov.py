import os
import glob
import pandas as pd
from sqlalchemy.orm import sessionmaker
from app.database.models import MasterFaucetsLOV
from scripts.db_helper import get_engine, init_db

def clean_value(val):
    if val is None or pd.isna(val):
        return None
    s = str(val).strip()
    if not s or s.lower() in ["nan", "none", "null"]:
        return None
    return s

def find_file(filename_pattern):
    candidates = [
        f"data/lov/{filename_pattern}",
        f"data/master/{filename_pattern}",
        f"data/{filename_pattern}",
        f"data/lov/*{filename_pattern}*",
        f"data/master/*{filename_pattern}*",
        f"data/*{filename_pattern}*"
    ]
    for c in candidates:
        matches = glob.glob(c)
        if matches:
            return matches[0]
    return None

def ingest_faucets_lov(engine=None):
    if engine is None:
        engine = get_engine()
    init_db(engine)

    category_files = [
        ("faucets", "FAUCETS_LOV.xlsx"),
        ("fittings", "Fittings_LOV.xlsx")
    ]

    records = []
    total_sheets = 0

    for cat_key, fname in category_files:
        filepath = find_file(fname)
        if not filepath or not os.path.exists(filepath):
            continue

        xls = pd.ExcelFile(filepath)
        total_sheets += len(xls.sheet_names)

        for sheet_name in xls.sheet_names:
            df = pd.read_excel(xls, sheet_name=sheet_name)
            for _, row in df.iterrows():
                attr_name = clean_value(row.get("Attribute Name") or row.get("Attribute") or row.get("Field"))
                val = clean_value(row.get("Allowed Value") or row.get("Value") or row.get("Allowed Values") or row.get("LOV"))
                uom = clean_value(row.get("UOM Standard") or row.get("UOM"))
                desc = clean_value(row.get("Description") or row.get("Guideline"))
                order = row.get("Build Order") or row.get("Order")
                try:
                    order_num = int(order) if order is not None and not pd.isna(order) else None
                except (ValueError, TypeError):
                    order_num = None

                remarks = clean_value(row.get("Remarks") or row.get("Notes"))

                if attr_name or val or desc:
                    records.append({
                        "category_key": cat_key,
                        "sheet_name": sheet_name,
                        "attribute_name": attr_name,
                        "allowed_value": val,
                        "uom_standard": uom,
                        "description": desc,
                        "build_order": order_num,
                        "remarks": remarks
                    })

    Session = sessionmaker(bind=engine)
    session = Session()
    try:
        session.query(MasterFaucetsLOV).delete()
        session.commit()

        batch = [MasterFaucetsLOV(**rec) for rec in records]
        session.bulk_save_objects(batch)
        session.commit()
        count = len(records)
        print(f"[ingest_faucets_lov] Successfully loaded {count} rows across {total_sheets} sheets into master_faucets_lov.")
        return count
    except Exception as e:
        session.rollback()
        print(f"[ingest_faucets_lov] Error during insertion: {e}")
        raise
    finally:
        session.close()

if __name__ == "__main__":
    ingest_faucets_lov()
