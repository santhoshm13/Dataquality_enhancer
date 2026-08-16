import pytest
from app.services.matching.brand_matching import BrandMatchingService, is_placeholder

CUSTOM_MASTER = [
    {"manufacturer_name": "Moen Incorporated", "manufacturer_code": "1001", "brand_name": "Moen®", "brand_code": "B001"},
    {"manufacturer_name": "BrassCraft Manufacturing", "manufacturer_code": "1002", "brand_name": "BrassCraft®", "brand_code": "B002"},
    {"manufacturer_name": "Rheem Manufacturing", "manufacturer_code": "1003", "brand_name": "FRIGIDAIRE®", "brand_code": "B003"},
    {"manufacturer_name": "Freud Inc", "manufacturer_code": "1004", "brand_name": "Diablo", "brand_code": "B004"},
    {"manufacturer_name": "Delta Faucet Company", "manufacturer_code": "1005", "brand_name": None, "brand_code": None}
]

@pytest.fixture
def matcher():
    return BrandMatchingService(master_records=CUSTOM_MASTER)

def test_brand_matching_exact(matcher):
    # Case-insensitive whitespace-normalized exact match
    res_mfg = matcher.match_manufacturer("moen incorporated")
    assert res_mfg["status"] == "PASS"
    assert res_mfg["matched_value"] == "Moen Incorporated"
    assert res_mfg["confidence"] == 1.0
    assert res_mfg["method"] == "exact"

    res_brand = matcher.match_brand("moen®")
    assert res_brand["status"] == "PASS"
    assert res_brand["matched_value"] == "Moen®"
    assert res_brand["confidence"] == 1.0
    assert res_brand["method"] == "exact"

def test_brand_matching_normalized(matcher):
    # Strips corporate suffixes (Inc, LLC, Ltd) and punctuation
    res_mfg = matcher.match_manufacturer("Freud Inc.")
    assert res_mfg["status"] == "PASS"
    assert res_mfg["matched_value"] == "Freud Inc"
    assert res_mfg["method"] in ["exact", "normalized"]

def test_brand_matching_fuzzy_above_threshold(matcher):
    # Fuzzy match >= threshold (default 90) returns exact canonical string with symbols
    res_brand = matcher.match_brand("FRIGIDAIR", threshold=90)
    assert res_brand["status"] == "PASS"
    assert res_brand["matched_value"] == "FRIGIDAIRE®"
    assert res_brand["confidence"] >= 0.90
    assert res_brand["method"] == "fuzzy"

def test_brand_matching_fuzzy_below_threshold(matcher):
    # Fuzzy match below threshold (score < 90) flags row as NEEDS_REVIEW and returns None
    res = matcher.match_brand("Random Unknown Brand XYZ", threshold=90)
    assert res["status"] == "NEEDS_REVIEW"
    assert res["matched_value"] is None
    assert res["method"] == "unmatched"

def test_brand_matching_placeholder_input(matcher):
    # Placeholder input resolves to null before matching even runs
    placeholders = ["-- Unbranded --", "-- No Unilog Brand --", "-- No DIB Brand --", "Unbranded", "No Brand", "", None]
    for ph in placeholders:
        assert is_placeholder(ph) is True
        res = matcher.match_brand(ph)
        assert res["matched_value"] is None
        assert res["status"] == "NEEDS_REVIEW"
        assert res["method"] == "placeholder_filtered"

def test_brand_matching_manufacturer_fallback(matcher):
    # When a matched manufacturer has no associated brand, use the canonical manufacturer name as the brand
    res = matcher.match_brand("Delta Faucet Company")
    assert res["status"] == "PASS"
    assert res["matched_value"] == "Delta Faucet Company"
