import os
import hashlib
import pandas as pd

search_roots = [
    r"c:\Users\SANTHOSHMOHAN\Desktop\unihacks",
    r"c:\Users\SANTHOSHMOHAN\Downloads",
    r"c:\Users\SANTHOSHMOHAN\Desktop",
    r"D:\\"
]

targets = [
    "UniCat_Manufacturer_and_Brand_List.xlsx",
    "Unicat_Lov_v1_0_Updated_With_Remarks.xlsx",
    "Unilog_Master_UOM_Standards_Abbreviations_and_Terms.xlsx",
    "Decimal_Fraction.xlsx",
    "FAUCETS_LOV.xlsx",
    "Fittings_LOV.xlsx",
    "Unilog-Sample_200_Items-Input-vs-Output.xlsx",
    "Reference_Documents_Summary.xlsx"
]

found_files = []

for root_dir in search_roots:
    if not os.path.exists(root_dir):
        continue
    for root, dirs, files in os.walk(root_dir):
        if "node_modules" in root or ".git" in root or "__pycache__" in root or "anaconda" in root or "AppData" in root:
            continue
        for f in files:
            for t in targets:
                if t.lower() in f.lower():
                    full_path = os.path.join(root, f)
                    found_files.append((t, full_path))

print(f"Total target file matches found: {len(found_files)}")
print("="*80)

unique_matches = sorted(list(set(found_files)), key=lambda x: x[1])

for t_name, f_path in unique_matches:
    size_bytes = os.path.getsize(f_path)
    
    sha256 = hashlib.sha256()
    with open(f_path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            sha256.update(chunk)
    file_hash = sha256.hexdigest()

    print(f"\nTARGET FILE MATCH: {t_name}")
    print(f"  Exact Path : {f_path}")
    print(f"  Size       : {size_bytes:,} bytes ({size_bytes / (1024*1024):.4f} MB)")
    print(f"  SHA-256    : {file_hash}")

    if f_path.endswith(".xlsx") or f_path.endswith(".xls"):
        try:
            xls = pd.ExcelFile(f_path, engine="openpyxl")
            print(f"  Sheets ({len(xls.sheet_names)}): {xls.sheet_names}")
            for sname in xls.sheet_names:
                df = pd.read_excel(xls, sheet_name=sname, dtype=str).fillna("")
                print(f"    Sheet '{sname}' Shape: {df.shape[0]} rows x {df.shape[1]} columns")
                print("    First 2 rows:")
                for idx, r in df.head(2).iterrows():
                    print(f"      R{idx+1}: {dict(r)}")
                print("    Last 2 rows:")
                for idx, r in df.tail(2).iterrows():
                    print(f"      R{idx+1}: {dict(r)}")
        except Exception as e:
            print(f"    Error reading excel: {e}")
    elif f_path.endswith(".csv"):
        try:
            df = pd.read_csv(f_path, dtype=str).fillna("")
            print(f"  CSV Shape: {df.shape[0]} rows x {df.shape[1]} columns")
        except Exception as e:
            print(f"    Error reading csv: {e}")
