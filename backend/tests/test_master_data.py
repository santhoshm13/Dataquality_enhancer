import pytest
from app.services.master_data.master_data_service import master_data_service
from app.database.master_data_repository import master_repository

def test_master_data_ingestion():
    res = master_data_service.load_all_master_data()
    assert res["status"] == "success"
    
    stats = master_repository.get_stats()
    assert stats["manufacturers_count"] >= 4
    assert stats["brands_count"] >= 4
    assert stats["uom_standards_count"] >= 5
    assert stats["decimal_fractions_count"] >= 5
    assert stats["category_lovs_count"] >= 2

def test_manufacturer_lookup():
    master_data_service.load_all_master_data()
    assert master_repository.is_valid_manufacturer("Moen Incorporated")
    assert master_repository.is_valid_manufacturer("moen incorporated")
    assert master_repository.is_valid_manufacturer("BrassCraft Manufacturing")
    assert not master_repository.is_valid_manufacturer("Fake Mfg Company 99")

def test_brand_lookup():
    master_data_service.load_all_master_data()
    assert master_repository.is_valid_brand("Moen®")
    assert master_repository.is_valid_brand("moen®")
    assert master_repository.is_valid_brand("FRIGIDAIRE®")
    assert not master_repository.is_valid_brand("Fake Brand XYZ")

def test_uom_lookup():
    master_data_service.load_all_master_data()
    assert master_repository.is_valid_uom("GPM")
    assert master_repository.is_valid_uom("gpm")
    assert master_repository.is_valid_uom("PSI")
    assert master_repository.is_valid_uom("in")
    assert not master_repository.is_valid_uom("INVALID_UNIT_99")

def test_decimal_fraction_lookup():
    master_data_service.load_all_master_data()
    assert master_repository.get_fraction("0.5") == "1/2"
    assert master_repository.get_fraction("0.25") == "1/4"
    assert master_repository.get_fraction("0.75") == "3/4"
    assert master_repository.get_fraction("0.125") == "1/8"
