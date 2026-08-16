import os
import glob
import pandas as pd
from sqlalchemy.orm import sessionmaker
from app.database.models import MasterDecimalFraction
from scripts.db_helper import get_engine, init_db

def clean_value(val):
    if val is None or pd.isna(val):
        return None
    s = str(val).strip()
    if not s or s.lower() in ["nan", "none", "null"]:
        return None
    return s

def parse_float(val):
    s = clean_value(val)
    if not s:
        return None
    try:
        return float(s)
    except ValueError:
        return None

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

def ingest_decimal_fractions(engine=None):
    if engine is None:
        engine = get_engine()
    init_db(engine)

    filepath = find_file("Decimal_Fraction.xlsx")
    if not filepath or not os.path.exists(filepath):
        print(f"[ingest_decimal_fractions] File not found: {filepath}")
        return 0

    xls = pd.ExcelFile(filepath)
    df_raw = pd.read_excel(xls, sheet_name=0, header=None)

    records = []
    seen = set()

    # Parse 4 side-by-side blocks (or any number of column blocks across sheet)
    num_cols = df_raw.shape[1]

    # Check headers in row 0
    row0 = [clean_value(val) for val in df_raw.iloc[0]]

    # Step through column blocks
    col_idx = 0
    while col_idx < num_cols:
        # Slicing block of 2 to 4 columns
        block = df_raw.iloc[:, col_idx:col_idx+4]
        
        # Check rows in this column block
        for row_i in range(len(block)):
            row_vals = [clean_value(val) for val in block.iloc[row_i]]
            
            # Find decimal and fraction in row_vals
            dec_val = None
            frac_str = None
            alt_frac = None

            for val in row_vals:
                if not val:
                    continue
                f_val = parse_float(val)
                if f_val is not None and dec_val is None:
                    dec_val = f_val
                elif "/" in val and frac_str is None:
                    frac_str = val
                elif ("in" in val.lower() or "/" in val) and alt_frac is None:
                    alt_frac = val

            if dec_val is not None and frac_str is not None:
                key = (dec_val, frac_str)
                if key not in seen:
                    seen.add(key)
                    records.append({
                        "decimal_value": dec_val,
                        "fraction_string": frac_str,
                        "alternative_fraction": alt_frac
                    })

        col_idx += 2  # Advance to next side-by-side block

    Session = sessionmaker(bind=engine)
    session = Session()
    try:
        session.query(MasterDecimalFraction).delete()
        session.commit()

        batch = [MasterDecimalFraction(**rec) for rec in records]
        session.bulk_save_objects(batch)
        session.commit()
        count = len(records)
        print(f"[ingest_decimal_fractions] Successfully loaded {count} decimal-fraction mapping pairs into master_decimal_fractions.")
        return count
    except Exception as e:
        session.rollback()
        print(f"[ingest_decimal_fractions] Error during insertion: {e}")
        raise
    finally:
        session.close()

if __name__ == "__main__":
    ingest_decimal_fractions()
