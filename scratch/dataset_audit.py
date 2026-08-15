import os
import glob
import pandas as pd

print("=== DATASET INVESTIGATION AUDIT ===")

# 1. Inspect data/input/Unilog_200_Items_Input.csv
target_csv = os.path.join("data", "input", "Unilog_200_Items_Input.csv")
if os.path.exists(target_csv):
    df_200_csv = pd.read_csv(target_csv)
    print(f"\n1. {target_csv}:")
    print(f"   - Actual row count: {len(df_200_csv)}")
    print(f"   - Column count: {len(df_200_csv.columns)}")
    print(f"   - Columns: {list(df_200_csv.columns)}")
    print(f"   - First 5 Mfg_Part_Num values: {df_200_csv['Mfg_Part_Num'].head(5).tolist()}")
    print(f"   - Last 5 Mfg_Part_Num values: {df_200_csv['Mfg_Part_Num'].tail(5).tolist()}")
    print(f"   - Number of unique Mfg_Part_Num values: {df_200_csv['Mfg_Part_Num'].nunique()}")
else:
    print(f"\n1. {target_csv} DOES NOT EXIST.")

# Search for all occurrences of the 4 key dataset files across the repository
search_patterns = [
    "**/*Unilog-Sample_200_Items-Input-vs-Output*",
    "**/*Sample-1000_Items*",
    "**/*Unilog_200_Items_Input*",
    "**/*Unihack*Input*",
    "**/*Expected Output*"
]

print("\n2. WORKSPACE DATASET FILES FINDER:")
found_files = {}
for root, dirs, files in os.walk("."):
    # Skip .git, node_modules, .venv, __pycache__, brain
    if any(ignore in root for ignore in [".git", "node_modules", ".venv", "__pycache__", "brain"]):
        continue
    for f in files:
        if any(keyword in f for keyword in ["200", "1000", "Sample", "Input", "Output"]):
            filepath = os.path.join(root, f)
            try:
                size = os.path.getsize(filepath)
                if f.endswith(".csv"):
                    df_temp = pd.read_csv(filepath)
                    info = f"CSV: {len(df_temp)} rows x {len(df_temp.columns)} cols"
                elif f.endswith(".xlsx") or f.endswith(".xls"):
                    xl = pd.ExcelFile(filepath)
                    sheets = xl.sheet_names
                    sheet_info = []
                    for s in sheets:
                        df_s = xl.parse(s)
                        sheet_info.append(f"Sheet '{s}': {len(df_s)} rows x {len(df_s.columns)} cols")
                    info = f"Excel ({len(sheets)} sheets: {', '.join(sheet_info)})"
                else:
                    info = f"File: {size} bytes"
                print(f"   - {filepath} ({size} bytes) -> {info}")
            except Exception as e:
                print(f"   - {filepath} ({os.path.getsize(filepath)} bytes) -> Error: {e}")

