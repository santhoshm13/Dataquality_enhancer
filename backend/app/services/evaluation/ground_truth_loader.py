import os
import logging
import pandas as pd
from typing import Dict, Any, List, Tuple

logger = logging.getLogger("app.ground_truth")

# Absolute and relative candidate paths for READ-ONLY loading of ground truth files
CANDIDATE_PATHS = [
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "data", "expected", "Unilog-Sample_200_Items-Input-vs-Output.xlsx")),
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "expected", "Unilog-Sample_200_Items-Input-vs-Output.xlsx")),
    r"data/expected/Unilog-Sample_200_Items-Input-vs-Output.xlsx",
    r"../data/expected/Unilog-Sample_200_Items-Input-vs-Output.xlsx",
    r"data/expected/Unihack_ Expected Output - Delivery Format.csv",
    r"../data/expected/Unihack_ Expected Output - Delivery Format.csv",
    r"D:\Unihack_ Expected Output - Delivery Format.csv"
]

def load_official_ground_truth() -> Tuple[str, List[Dict[str, Any]], List[Dict[str, Any]], Dict[str, Dict[str, Any]]]:
    """
    Strictly READ-ONLY ground truth dataset loader.
    NEVER generates, modifies, writes, or synthesizes files.
    Returns (resolved_path, input_rows, delivery_rows, gt_map_by_part).
    """
    target_path = None
    for p in CANDIDATE_PATHS:
        if os.path.exists(p):
            target_path = p
            break

    if not target_path:
        logger.error("No existing ground truth file found in candidate paths.")
        return "None", [], [], {}

    logger.info(f"READ-ONLY loading of ground truth dataset from: {target_path}")

    input_rows: List[Dict[str, Any]] = []
    delivery_rows: List[Dict[str, Any]] = []
    gt_map: Dict[str, Dict[str, Any]] = {}

    try:
        if target_path.endswith(".xlsx"):
            xls = pd.ExcelFile(target_path, engine="openpyxl")
            sheet_names = xls.sheet_names
            
            input_sheet = "Input" if "Input" in sheet_names else sheet_names[0]
            delivery_sheet = "Delivery Format" if "Delivery Format" in sheet_names else sheet_names[-1]

            df_input = pd.read_excel(xls, sheet_name=input_sheet, dtype=str).fillna("")
            df_delivery = pd.read_excel(xls, sheet_name=delivery_sheet, dtype=str).fillna("")

            input_rows = df_input.to_dict(orient="records")
            delivery_rows = df_delivery.to_dict(orient="records")
        else:
            df_delivery = pd.read_csv(target_path, dtype=str).fillna("")
            delivery_rows = df_delivery.to_dict(orient="records")

        for row in delivery_rows:
            part = str(row.get("Mfg_Part_Num", "")).strip()
            if part:
                gt_map[part] = row

    except Exception as e:
        logger.error(f"Error reading ground truth file {target_path}: {e}")

    return target_path, input_rows, delivery_rows, gt_map
