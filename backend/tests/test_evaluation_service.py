import pytest
from app.services.evaluation.ground_truth_loader import load_official_ground_truth
from app.services.evaluation.evaluation_service import evaluation_service, normalize_value, normalize_text
from app.database.repository import repository

def test_ground_truth_loader():
    target_path, input_rows, delivery_rows, gt_map = load_official_ground_truth()
    assert len(gt_map) >= 2
    assert len(delivery_rows) >= 2

def test_value_normalization():
    assert normalize_value("  test  ") == "test"
    assert normalize_value("nan") == ""
    assert normalize_value("N/A") == ""
    assert normalize_text("  MOEN®  ") == "moen®"

def test_evaluation_service_with_no_products():
    repository.clear()
    res = evaluation_service.evaluate()
    assert res["status"] in ["no_predictions", "error"]
    assert res["evaluated_rows"] == 0
    assert res["total_ground_truth_rows"] >= 2

def test_evaluation_service_with_matching_products():
    repository.clear()
    target_path, input_rows, delivery_rows, gt_map = load_official_ground_truth()
    sample_part = list(gt_map.keys())[0]
    gt_item = gt_map[sample_part]

    raw_item = {
        "Mfg_Part_Num": sample_part,
        "Part_Desc": gt_item.get("Part_Desc", "Test Product"),
        "E1_Brand": gt_item.get("BRAND_NAME", "Test Brand"),
        "Unilog_Brand": "-- No Unilog Brand --",
        "DIB_Brand": "-- No DIB Brand --",
        "Part_Manuf": gt_item.get("MANUFACTURER_NAME", "Test Mfg")
    }
    p = repository.add_product(raw_item)
    
    p["status"] = "PROCESSED"
    p["enrichment"] = {
        "manufacturer": gt_item.get("MANUFACTURER_NAME"),
        "brand": gt_item.get("BRAND_NAME"),
        "department": gt_item.get("Dept"),
        "class": gt_item.get("Class"),
        "category": gt_item.get("Fine"),
        "classpath": gt_item.get("Classpath"),
        "confidence_score": 1.0,
        "status": "PROCESSED"
    }

    res = evaluation_service.evaluate()
    assert res["status"] == "success"
    assert res["evaluated_rows"] == 1
    assert res["manufacturer_accuracy"] == 100.0
    assert res["brand_accuracy"] == 100.0
