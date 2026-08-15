import io
import pandas as pd
import pytest
from app.utils.file_parser import parse_file_to_dataframe

def test_parse_csv_success():
    csv_content = b"Mfg_Part_Num,Part_Desc,E1_Brand,Unilog_Brand,DIB_Brand,Part_Manuf\nPART-001,Test Desc,,,,"
    df, errors = parse_file_to_dataframe(csv_content, "sample.csv")
    assert len(df) == 1
    assert df.iloc[0]["Mfg_Part_Num"] == "PART-001"
    assert errors == []

def test_parse_xlsx_success():
    df_raw = pd.DataFrame([{
        "Mfg_Part_Num": "PART-XLSX-1",
        "Part_Desc": "Excel Dishwasher Test",
        "E1_Brand": "Brand A",
        "Unilog_Brand": "Brand B",
        "DIB_Brand": "Brand C",
        "Part_Manuf": "Manufacturer X"
    }])
    output = io.BytesIO()
    df_raw.to_excel(output, index=False, engine="openpyxl")
    
    df, errors = parse_file_to_dataframe(output.getvalue(), "sample.xlsx")
    assert len(df) == 1
    assert df.iloc[0]["Mfg_Part_Num"] == "PART-XLSX-1"

def test_missing_required_column_raises_error():
    csv_content = b"Mfg_Part_Num,Part_Desc\nPART-001,Test Desc"
    with pytest.raises(Exception) as exc_info:
        parse_file_to_dataframe(csv_content, "invalid.csv")
    assert "missing required columns" in str(exc_info.value)
