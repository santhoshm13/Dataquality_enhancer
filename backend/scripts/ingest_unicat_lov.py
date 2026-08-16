import os
import glob
import pandas as pd
from sqlalchemy.orm import sessionmaker
from app.database.models import MasterUnicatLOV
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

def ingest_unicat_lov(engine=None):
    if engine is None:
        engine = get_engine()
    init_db(engine)

    filepath = find_file("Unicat_Lov_v1_0_Updated_With_Remarks.xlsx")
    if not filepath or not os.path.exists(filepath):
        print(f"[ingest_unicat_lov] File not found: {filepath}")
        return 0

    xls = pd.ExcelFile(filepath)
    df = pd.read_excel(xls, sheet_name=0)

    records = []
    for _, row in df.iterrows():
        dept = clean_value(row.get("Department"))
        cls = clean_value(row.get("Class"))
        fine = clean_value(row.get("Fine Category") or row.get("Leaf Node"))
        cp = clean_value(row.get("Classpath"))
        if not cp and (dept or cls or fine):
            cp = " > ".join(filter(None, [dept, cls, fine]))

        attr_lbl = clean_value(row.get("Attribute Label") or row.get("Attribute Name"))
        attr_val = clean_value(row.get("Attribute Values") or row.get("Approved LOV Value"))

        if cp or attr_lbl or attr_val:
            records.append({
                "classpath": cp,
                "department": dept,
                "class_name": cls,
                "fine_category": fine,
                "leaf_node": clean_value(row.get("Leaf Node")),
                "filtering": clean_value(row.get("Filtering Y/N") or row.get("Filtering")),
                "attribute_label": attr_lbl,
                "attribute_values": attr_val,
                "normalized_label": clean_value(row.get("Normalized Label")),
                "normalized_values": clean_value(row.get("Normalized Values")),
                "guidelines": clean_value(row.get("Guidelines")),
                "remarks": clean_value(row.get("Remarks"))
            })

    Session = sessionmaker(bind=engine)
    session = Session()
    try:
        session.query(MasterUnicatLOV).delete()
        session.commit()

        # Batch insertion for large datasets (~161k rows)
        batch_size = 10000
        for i in range(0, len(records), batch_size):
            chunk = [MasterUnicatLOV(**rec) for rec in records[i:i+batch_size]]
            session.bulk_save_objects(chunk)
            session.commit()

        count = len(records)
        print(f"[ingest_unicat_lov] Successfully loaded {count} rows into master_unicat_lov.")
        return count
    except Exception as e:
        session.rollback()
        print(f"[ingest_unicat_lov] Error during insertion: {e}")
        raise
    finally:
        session.close()

if __name__ == "__main__":
    ingest_unicat_lov()
