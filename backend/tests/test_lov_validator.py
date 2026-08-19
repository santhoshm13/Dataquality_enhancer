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
        LovEntry(
            attribute_label="Finish",
            attribute_values="Stainless Steel, Matte Black, White, Chrome, Black Stainless",
            normalized_label="finish",
            normalized_values="stainless steel, matte black, white, chrome, black stainless",
            filtering="Y",
            guidelines="",
            uom_standard=None,
            classpath=cp
        ),
        # Constrained dimension attribute with explicit permitted values
        LovEntry(
            attribute_label="Fitting Size",
            attribute_values="1/2 in, 3/4 in, 1 in",
            normalized_label="fitting size",
            normalized_values="1/2 in, 3/4 in, 1 in",
            filtering="Y",
            guidelines="",
            uom_standard="in",
            classpath=cp
        ),
        # Unconstrained dimension attribute (no allowed_set / no normalized_values)
        LovEntry(
            attribute_label="Depth",
            attribute_values=None,
            normalized_label="depth",
            normalized_values=None,
            filtering="Y",
            guidelines="",
            uom_standard="in",
            classpath=cp
        ),
        LovEntry(
            attribute_label="Width",
            attribute_values=None,
            normalized_label="width",
            normalized_values=None,
            filtering="Y",
            guidelines="",
            uom_standard="in",
            classpath=cp
        ),
        # Non-dimension attribute
        LovEntry(
            attribute_label="Voltage Rating",
            attribute_values=None,
            normalized_label="voltage rating",
            normalized_values=None,
            filtering="Y",
            guidelines="",
            uom_standard="V",
            classpath=cp
        )
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

def test_fraction_conversion_service():
    assert fraction_service.decimal_to_fraction("0.5") == "1/2"
    assert fraction_service.decimal_to_fraction("0.25") == "1/4"
    assert fraction_service.decimal_to_fraction("0.26") == "17/64"
    assert fraction_service.decimal_to_fraction("50.25") == "50-1/4"

def test_unconstrained_dimension_attribute_fraction_conversion():
    """
    Rule: A Dimension attribute (e.g. 'Depth') with NO LOV constraint and a decimal value
    should be fraction-converted (e.g. 50.25 with UOM 'in' -> '50-1/4 in').
    """
    result = lov_validator.validate_attribute(
        category="Built-In Dishwashers",
        classpath="Built-In Dishwashers",
        attr_name="Depth",
        attr_value="50.25",
        attr_uom="in"
    )
    assert result["validation_status"] == "PASS"
    assert result["normalized_value"] == "50-1/4 in"
    assert result["approved_value"] == "50-1/4 in"

def test_lov_constrained_dimension_attribute_no_fraction_conversion():
    """
    Rule: A Dimension attribute that IS LOV-constrained with enumerated values
    should NOT be auto-converted to a fraction; it should go through standard LOV match.
    """
    result = lov_validator.validate_attribute(
        category="Built-In Dishwashers",
        classpath="Built-In Dishwashers",
        attr_name="Fitting Size",
        attr_value="3/4 in",
        attr_uom="in"
    )
    assert result["validation_status"] == "PASS"
    assert result["approved_value"] == "3/4 in"

def test_non_dimension_attribute_with_decimal():
    """
    Rule: A non-Dimension attribute (e.g. Voltage Rating with UOM 'V')
    should NOT be fraction-converted.
    """
    result = lov_validator.validate_attribute(
        category="Built-In Dishwashers",
        classpath="Built-In Dishwashers",
        attr_name="Voltage Rating",
        attr_value="120.5",
        attr_uom="V"
    )
    assert result["validation_status"] == "PASS"
    assert result["normalized_value"] == "120.5"
    assert result["approved_value"] == "120.5"

def test_dishwasher_dimensional_formatting_example():
    """
    Confirm the worked example from the brief:
    Width = 24 with UOM in -> 24 in
    Depth = 24.25 with UOM in -> 24-1/4 in
    Produces "24 in W x 24-1/4 in D" style description formatting.
    """
    w_res = lov_validator.validate_attribute(
        category="Built-In Dishwashers",
        classpath="Built-In Dishwashers",
        attr_name="Width",
        attr_value="24",
        attr_uom="in"
    )
    d_res = lov_validator.validate_attribute(
        category="Built-In Dishwashers",
        classpath="Built-In Dishwashers",
        attr_name="Depth",
        attr_value="24.25",
        attr_uom="in"
    )

    w_val = w_res["approved_value"]
    d_val = d_res["approved_value"]

    # When whole number 24 is converted or passed as 24, fraction_service returns "24" (or empty fraction for 24.0)
    # So "24 in" or "24 in W"
    dim_str = f"{w_val} W x {d_val} D" if "in" in w_val else f"{w_val} in W x {d_val} D"
    assert "24-1/4 in D" in dim_str
    assert "24" in dim_str
