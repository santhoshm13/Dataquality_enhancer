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
]

def get_stable_identifier(row: Dict[str, Any]) -> str:
    """
    Generates a stable, collision-free identifier for matching product rows
    to ground truth delivery rows.

    Strategy: Use Mfg_Part_Num (stripped, lowercased) as the sole primary key.
    Both the product repository (field: mfg_part_num) and the GT delivery format
    (column: Mfg_Part_Num) share this field as a reliable 1:1 identifier across
    the 200-item ground truth dataset.

    The previous SKU + Part_Manuf composite caused mismatches because:
    - Internal product records never populate 'SKU' (they use 'mfg_part_num')
    - Part_Manuf values differ slightly between input and delivery sheets
    """
    # Primary: Mfg_Part_Num in any casing variant
    part_num = (
        row.get("Mfg_Part_Num") or
        row.get("mfg_part_num") or
        row.get("MANUFACTURER_PART_NUMBER") or
        row.get("Part_Num") or
        ""
    )
    part_num = str(part_num).strip().lower()
    if part_num:
        return f"MPN::{part_num}"

    # Fallback: never reached for the 200-item GT dataset (all rows have Mfg_Part_Num)
    return f"MPN::unknown"


def load_official_ground_truth() -> Tuple[str, List[Dict[str, Any]], List[Dict[str, Any]], Dict[str, Dict[str, Any]]]:
    """
    Strictly READ-ONLY ground truth dataset loader.
    NEVER generates, modifies, writes, or synthesizes files.
    Returns (resolved_path, input_rows, delivery_rows, gt_map_by_identifier).
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
        xls = pd.ExcelFile(target_path, engine="openpyxl")
        sheet_names = xls.sheet_names
        
        input_sheet = "Input" if "Input" in sheet_names else sheet_names[0]
        delivery_sheet = "Delivery Format" if "Delivery Format" in sheet_names else sheet_names[-1]

        df_input = pd.read_excel(xls, sheet_name=input_sheet, dtype=str).fillna("")
        df_delivery = pd.read_excel(xls, sheet_name=delivery_sheet, dtype=str).fillna("")

        input_rows = df_input.to_dict(orient="records")
        delivery_rows = df_delivery.to_dict(orient="records")

        for row in delivery_rows:
            key = get_stable_identifier(row)
            if key and key != "MPN::unknown":
                gt_map[key] = row

        logger.info(f"Ground truth loaded: {len(delivery_rows)} delivery rows, {len(gt_map)} keyed entries.")

    except Exception as e:
        logger.error(f"Error reading ground truth file {target_path}: {e}")

    return target_path, input_rows, delivery_rows, gt_map
