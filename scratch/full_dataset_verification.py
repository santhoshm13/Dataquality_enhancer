import os
import pandas as pd

print("=== FULL DATASET INTEGRITY & SEARCH AUDIT ===")

files_to_check = [
    "Unilog-Sample_200_Items-Input-vs-Output.xlsx",
    "Sample-1000_Items.xlsx",
    "Unilog_200_Items_Input.csv",
    "Unihack_ Sample Dataset - Input.csv",
    "Unihack_ Expected Output - Delivery Format.csv"
]

for filename in files_to_check:
    matches = []
    for root, dirs, files in os.walk("."):
        if any(ignore in root for ignore in [".git", "node_modules", ".venv", "__pycache__", "brain"]):
            continue
        if filename in files:
            matches.append(os.path.join(root, filename))
    print(f"\nSearching for '{filename}':")
    if not matches:
        print("  -> NOT FOUND in workspace.")
    else:
        for m in matches:
            size = os.path.getsize(m)
            if m.endswith(".csv"):
                df = pd.read_csv(m)
                print(f"  -> FOUND: {m} ({size} bytes) | Rows: {len(df)}, Cols: {len(df.columns)}")
            elif m.endswith(".xlsx") or m.endswith(".xls"):
                xl = pd.ExcelFile(m)
                sheets = xl.sheet_names
                print(f"  -> FOUND: {m} ({size} bytes) | Sheets: {sheets}")
            else:
                print(f"  -> FOUND: {m} ({size} bytes)")

