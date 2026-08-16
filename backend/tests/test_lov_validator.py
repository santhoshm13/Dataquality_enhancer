import pytest
from app.validators.lov_validator import lov_validator
from app.services.master_data.fraction_service import fraction_service
from app.services.lov.lov_retrieval_service import lov_retrieval_service
from app.schemas.lov import LovEntry

@pytest.fixture(autouse=True)
def setup_mock_data():
    # Setup mock data for tests to avoid DB reliance
    lov_retrieval_service.clear_cache()
    cp = "Built-In Dishwashers"
    entries = [
        LovEntry(attribute_label="Finish", attribute_values="Stainless Steel, Matte Black, White, Chrome, Black Stainless", 
                 normalized_label="finish", normalized_values="stainless steel, matte black, white, chrome, black stainless", 
                 filtering="Y", guidelines="", uom_standard=None, classpath=cp)
    ]
    lov_retrieval_service._cache[cp] = entries

def test_valid_lov_attribute_accepted():
    result = lov_validator.validate_attribute(
        category="Built-In Dishwashers",
        classpath="Built-In Dishwashers",
        attr_name="Finish",
        attr_value="Stainless Steel"
    )
    assert result["validation_status"] == "PASS"

def test_invalid_lov_attribute_rejected():
    result = lov_validator.validate_attribute(
        category="Built-In Dishwashers",
        classpath="Built-In Dishwashers",
        attr_name="Finish",
        attr_value="Polished Silver"
    )
    assert result["validation_status"] == "NEEDS_REVIEW"
    assert "Polished Silver" in result["validation_reason"]

def test_fuzzy_lov_attribute_accepted():
    # Fuzzy match threshold is 85. 'stainles steel' should fuzzy match 'stainless steel'.
    result = lov_validator.validate_attribute(
        category="Built-In Dishwashers",
        classpath="Built-In Dishwashers",
        attr_name="Finish",
        attr_value="stainles steel"
    )
    assert result["validation_status"] == "PASS"
    assert result["approved_value"] == "stainless steel"

def test_uom_normalization():
    inputs = ["Volts", "VOLT", "V", "v", "volts"]
    for i in inputs:
        assert lov_validator.normalize_uom(i) == "V"

def test_fraction_conversion():
    assert fraction_service.decimal_to_fraction("0.5") == "1/2"
    assert fraction_service.decimal_to_fraction("0.25") == "1/4"
    assert fraction_service.decimal_to_fraction("0.26") == "17/64" # 0.26 is approx 16.64/64 -> rounds to 17/64 (0.265625)
    assert fraction_service.decimal_to_fraction("50.25") == "50-1/4"
