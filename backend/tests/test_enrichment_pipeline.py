import pytest
import io
import pandas as pd
from app.utils.file_parser import parse_file_to_dataframe, clean_placeholder, normalize_product_record
from app.services.matching.brand_matching import brand_matcher
from app.services.master_data.uom_service import uom_service
from app.services.master_data.fraction_service import fraction_service
from app.services.llm.description_generator import description_generator
from app.validators.lov_validator import lov_validator
from app.services.confidence_engine import confidence_engine
from app.pipeline.delivery_formatter import delivery_generator
from app.pipeline.enrichment_pipeline import pipeline_engine

def test_file_parser_csv():
    csv_data = "Mfg_Part_Num,Part_Desc,E1_Brand,Unilog_Brand,DIB_Brand,Part_Manuf\nPN100,Test Product,-- Unbranded --,-- No Unilog Brand --,-- No DIB Brand --,Test Mfg (1234)\n"
    df, errors = parse_file_to_dataframe(csv_data.encode("utf-8"), "test.csv")
    assert len(df) == 1
    assert list(df.columns) == ["Mfg_Part_Num", "Part_Desc", "E1_Brand", "Unilog_Brand", "DIB_Brand", "Part_Manuf"]

def test_file_parser_xlsx():
    df_raw = pd.DataFrame([{
        "Mfg_Part_Num": "PN200",
        "Part_Desc": "XLSX Product",
        "E1_Brand": "BrandA",
        "Unilog_Brand": "-- No Unilog Brand --",
        "DIB_Brand": "-- No DIB Brand --",
        "Part_Manuf": "Mfg Corp"
    }])
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df_raw.to_excel(writer, index=False)
    
    df_parsed, errors = parse_file_to_dataframe(output.getvalue(), "test.xlsx")
    assert len(df_parsed) == 1
    assert df_parsed.iloc[0]["Mfg_Part_Num"] == "PN200"

def test_placeholder_cleaning():
    assert clean_placeholder("-- Unbranded --") == ""
    assert clean_placeholder("-- No Unilog Brand --") == ""
    assert clean_placeholder("-- No DIB Brand --") == ""
    assert clean_placeholder("Diablo") == "Diablo"

def test_manufacturer_matching():
    res_exact = brand_matcher.match_manufacturer("Freud Inc (2435)")
    assert res_exact["matched_value"] == "Freud Inc"
    assert res_exact["status"] == "PASS"

    res_fuzzy = brand_matcher.match_manufacturer("Rheem Mfg")
    assert res_fuzzy["status"] in ["PASS", "NEEDS_REVIEW"]

def test_uom_normalization():
    assert uom_service.normalize_uom("VOLTS") == "V"
    assert uom_service.normalize_uom("AMPS") == "A"
    assert uom_service.normalize_uom("INCHES") == "in"
    assert uom_service.format_value_with_uom("10", "INCHES") == "10 in"

def test_fraction_conversion():
    assert fraction_service.decimal_to_fraction("0.5") == "1/2"
    assert fraction_service.decimal_to_fraction("0.25") == "1/4"
    assert fraction_service.decimal_to_fraction("0.75") == "3/4"
    assert fraction_service.decimal_to_fraction("0.125") == "1/8"

def test_lov_validation():
    # Setup mock data for tests to avoid DB reliance
    from app.services.lov.lov_retrieval_service import lov_retrieval_service
    from app.schemas.lov import LovEntry
    lov_retrieval_service.clear_cache()
    cp = "Built-In Dishwashers"
    entries = [
        LovEntry(attribute_label="Finish", attribute_values="Stainless Steel", normalized_label="finish", normalized_values="stainless steel", filtering="Y", guidelines="", uom_standard=None, classpath=cp)
    ]
    lov_retrieval_service._cache[cp] = entries
    
    # Valid LOV
    res_valid = lov_validator.validate_attribute(
        category="Built-In Dishwashers",
        attr_name="Finish",
        attr_value="Stainless Steel",
        classpath=cp
    )
    assert res_valid["validation_status"] == "PASS"

    # Invalid LOV rejection
    res_invalid = lov_validator.validate_attribute(
        category="Built-In Dishwashers",
        attr_name="Finish",
        attr_value="Purple Plastic",
        classpath=cp
    )
    assert res_invalid["validation_status"] == "NEEDS_REVIEW"

import asyncio
def test_description_character_limits():
    descs = asyncio.run(description_generator.generate_fact_grounded_descriptions(
        mfg_part_num="PN-999",
        brand="DeWalt",
        manufacturer="Black & Decker",
        category="Drill Driver",
        validated_attributes=[{"name": "Voltage", "value": "20", "uom": "V"}]
    ))
    assert len(descs["MOBILE_DESC"]) <= 80
    assert len(descs["INVOICE_DESC"]) <= 40
    assert len(descs["SHORT_DESC"]) <= 80
    assert len(descs["LONG_DESC1"]) <= 1000

def test_faucets_e2e_pipeline():
    from app.pipeline.enrichment_pipeline import pipeline_engine
    
    product = {
        "id": 123,
        "mfg_part_num": "F100",
        "raw_description": "Kitchen Faucet with Pull-Down Sprayer Chrome",
        "raw_manufacturer": "Kohler",
        "raw_brand_e1": "Kohler"
    }
    
    from app.services.classification.category_classifier import classifier
    original_classify = classifier.classify
    classifier.classify = lambda desc, **kwargs: {
        "department": "Plumbing",
        "class": "Faucets",
        "fine": "Kitchen Faucets",
        "category": "Kitchen Faucets",
        "classpath": "Plumbing > Faucets > Kitchen Faucets",
        "confidence": 0.95
    }
    
    try:
        enriched = asyncio.run(pipeline_engine.run_pipeline(product))
    finally:
        classifier.classify = original_classify
    
    assert enriched["status"] in ["HIGH", "MEDIUM", "NEEDS_REVIEW"]
    assert enriched["enrichment"]["category"] != ""
    assert "Faucets" in enriched["enrichment"]["classpath"] or "Faucets" in enriched["enrichment"]["category"]
    
    # We should have at least some validation results
    assert len(enriched["validation_results"]) >= 2

def test_confidence_engine():
    mfg_m = {"confidence": 1.0, "status": "PASS"}
    brand_m = {"confidence": 1.0, "status": "PASS"}
    class_res = {"confidence": 0.90}
    val_attrs = [{"validation_status": "PASS"}]

    score, status, reasons = confidence_engine.calculate_confidence(mfg_m, brand_m, class_res, val_attrs)
    assert score >= 0.85
    assert status == "HIGH"

def test_delivery_format_schema_and_row_count():
    sample_products = [
        {"id": 1, "mfg_part_num": "P1", "raw_description": "Desc 1"},
        {"id": 2, "mfg_part_num": "P2", "raw_description": "Desc 2"},
        {"id": 3, "mfg_part_num": "P3", "raw_description": "Desc 3"}
    ]
    csv_str = delivery_generator.generate_csv_string(sample_products)
    lines = csv_str.strip().split("\n")
    # 1 header + 3 rows = 4 lines
    assert len(lines) == 4

    excel_bytes = delivery_generator.generate_excel_bytes(sample_products)
    df_xl = pd.read_excel(io.BytesIO(excel_bytes), sheet_name="Delivery Format")
    assert len(df_xl) == 3
    assert len(df_xl.columns) == 252

@pytest.mark.anyio
async def test_full_pipeline_run():
    p_raw = {
        "id": 1,
        "mfg_part_num": "DCB518ASTS06G",
        "raw_description": "Diablo 1/2x18 Sanding Belt 6pc",
        "raw_brand_e1": "-- Unbranded --",
        "raw_brand_unilog": "-- No Unilog Brand --",
        "raw_brand_dib": "-- No DIB Brand --",
        "raw_manufacturer": "Freud Inc (2435)"
    }
    enriched = await pipeline_engine.run_pipeline(p_raw)
    assert enriched["mfg_part_num"] == "DCB518ASTS06G"
    assert "enrichment" in enriched
    assert len(enriched["descriptions"]) == 6
