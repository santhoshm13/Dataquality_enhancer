import pytest
from app.services.evaluation.ground_truth_loader import load_official_ground_truth
from app.services.evaluation.evaluation_service import evaluation_service, normalize_value, normalize_text, compare_product_attributes
from app.database.repository import repository

def test_ground_truth_loader():
    target_path, input_rows, delivery_rows, gt_map = load_official_ground_truth()
    assert len(input_rows) == 200
    assert len(delivery_rows) == 200
    assert len(gt_map) == 200

def test_value_normalization():
    assert normalize_value("  test  ") == "test"
    assert normalize_value("nan") == ""
    assert normalize_value("N/A") == ""
    assert normalize_text("  MOEN®  ") == "moen®"

def test_evaluator_loads_200_matched_row_pairs():
    repository.clear()
    target_path, input_rows, delivery_rows, gt_map = load_official_ground_truth()
    assert len(input_rows) == 200
    assert len(delivery_rows) == 200
    assert len(gt_map) == 200
    res = evaluation_service.evaluate()
    assert res["status"] == "success"
    assert res["evaluated_rows"] == 200
    assert res["total_ground_truth_rows"] == 200

def test_evaluation_service_returns_none_when_unmatched(monkeypatch):
    repository.clear()
    # Mock load_official_ground_truth to return empty input rows so evaluated_rows == 0
    import app.services.evaluation.evaluation_service as eval_mod
    monkeypatch.setattr(eval_mod, "load_official_ground_truth", lambda: ("dummy.xlsx", [], [], {}))
    res = eval_mod.evaluation_service.evaluate()
    assert res["status"] == "error"
    assert res["evaluated_rows"] == 0
    assert res["overall_field_exact_match_pct"] is None
    assert res["manufacturer_accuracy"] is None
    assert res["brand_accuracy"] is None
    assert res["attribute_accuracy"] is None

def test_evaluation_service_with_matching_products():
    repository.clear()
    target_path, input_rows, delivery_rows, gt_map = load_official_ground_truth()
    sample_key = list(gt_map.keys())[0]
    gt_item = gt_map[sample_key]

    raw_item = {
        "Mfg_Part_Num": gt_item.get("Mfg_Part_Num", "DCB518ASTS06G"),
        "Part_Desc": gt_item.get("Part_Desc", "Test Product"),
        "E1_Brand": gt_item.get("BRAND_NAME", "Test Brand"),
        "Unilog_Brand": "-- No Unilog Brand --",
        "DIB_Brand": "-- No DIB Brand --",
        "Part_Manuf": gt_item.get("Part_Manuf", "Freud Inc (2435)")
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

def test_attribute_comparison_same_attributes_different_order():
    gt_item = {
        "attributes": [
            {"name": "Color", "value": "Red", "uom": ""},
            {"name": "Size", "value": "Large", "uom": "in"}
        ]
    }
    predicted_attrs = [
        {"name": "Size", "value": "Large", "uom": "in"},
        {"name": "Color", "value": "Red", "uom": ""}
    ]
    res = compare_product_attributes(predicted_attrs, gt_item)
    assert res["total_gt_attributes"] == 2
    assert res["complete_matches"] == 2
    assert res["missing_attributes"] == 0
    assert res["extra_attributes"] == 0
    assert res["accuracy_pct"] == 100.0

def test_attribute_comparison_missing_attribute():
    gt_item = {
        "attributes": [
            {"name": "Color", "value": "Red", "uom": ""},
            {"name": "Size", "value": "Large", "uom": "in"}
        ]
    }
    predicted_attrs = [
        {"name": "Color", "value": "Red", "uom": ""}
    ]
    res = compare_product_attributes(predicted_attrs, gt_item)
    assert res["total_gt_attributes"] == 2
    assert res["complete_matches"] == 1
    assert res["missing_attributes"] == 1
    assert res["extra_attributes"] == 0
    assert res["accuracy_pct"] == 50.0

def test_attribute_comparison_extra_attribute():
    gt_item = {
        "attributes": [
            {"name": "Color", "value": "Red", "uom": ""}
        ]
    }
    predicted_attrs = [
        {"name": "Color", "value": "Red", "uom": ""},
        {"name": "Material", "value": "Plastic", "uom": ""}
    ]
    res = compare_product_attributes(predicted_attrs, gt_item)
    assert res["total_gt_attributes"] == 1
    assert res["complete_matches"] == 1
    assert res["missing_attributes"] == 0
    assert res["extra_attributes"] == 1
    assert res["accuracy_pct"] == 100.0
    assert len(res["extra_attribute_details"]) == 1
    assert res["extra_attribute_details"][0]["attribute_name"] == "Material"

def test_252_column_evaluation_excludes_blank_gt_cells():
    repository.clear()
    res = evaluation_service.evaluate()
    assert res["status"] == "success"
    assert res["evaluated_rows"] == 200
    # Blank GT cells should be excluded from total populated GT cells count
    total_populated = res["details"]["total_non_empty_gt_fields"]
    assert total_populated > 0
    assert total_populated < 200 * 252  # Less than total 50,400 cells because blank GT cells are excluded

def test_252_column_schema_breakdown_endpoint():
    breakdown = evaluation_service.get_252_column_schema_breakdown()
    assert breakdown["status"] == "success"
    assert breakdown["total_headers"] == 252
    assert breakdown["evaluated_rows"] == 200
    assert "category_breakdown" in breakdown
    assert "identification" in breakdown["category_breakdown"]
    assert "classification" in breakdown["category_breakdown"]
    assert "attributes" in breakdown["category_breakdown"]
    assert "descriptions" in breakdown["category_breakdown"]
    assert "digital_assets" in breakdown["category_breakdown"]
    assert len(breakdown["field_breakdown"]) == 252
