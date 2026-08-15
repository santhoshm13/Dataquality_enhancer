import pytest
from app.validators.lov_validator import lov_validator

def test_valid_lov_attribute_accepted():
    result = lov_validator.validate_attribute(
        category="Built-In Dishwashers",
        attr_name="Finish",
        attr_value="Stainless Steel"
    )
    assert result["validation_status"] == "PASS"

def test_invalid_llm_attribute_value_rejected():
    """
    Mandatory test requirement: Proves that an invalid LLM attribute value
    is rejected when it is not present in the approved LOV list.
    (e.g., AI returns Finish = 'Polished Silver' when LOV allows Chrome, Stainless Steel, Matte Black)
    """
    result = lov_validator.validate_attribute(
        category="Built-In Dishwashers",
        attr_name="Finish",
        attr_value="Polished Silver"
    )
    assert result["validation_status"] == "FAIL"
    assert "Polished Silver" in result["validation_reason"]
    assert "not present in approved LOV list" in result["validation_reason"]

def test_uom_normalization():
    assert lov_validator.normalize_uom("Volts") == "V"
    assert lov_validator.normalize_uom("Amps") == "A"
    assert lov_validator.normalize_uom("Inches") == "in"
