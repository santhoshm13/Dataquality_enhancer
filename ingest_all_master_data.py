import sys
import os

# Ensure backend directory is in python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

from scripts.db_helper import get_engine, init_db
from scripts.ingest_manufacturer_brands import ingest_manufacturer_brands
from scripts.ingest_unicat_lov import ingest_unicat_lov
from scripts.ingest_uom_standards import ingest_uom_standards
from scripts.ingest_decimal_fractions import ingest_decimal_fractions
from scripts.ingest_faucets_lov import ingest_faucets_lov

def main():
    print("=" * 80)
    print("Starting Reference Master Data PostgreSQL Ingestion Pipeline...")
    print("=" * 80)

    engine = get_engine()
    print(f"Database Engine Target: {engine.url}")
    init_db(engine)
    print("Database tables initialized / verified successfully.\n")

    summary = {}

    print("--- [1/5] Ingesting UniCat_Manufacturer_and_Brand_List.xlsx ---")
    c1 = ingest_manufacturer_brands(engine)
    summary["master_manufacturers_brands"] = c1

    print("\n--- [2/5] Ingesting Unicat_Lov_v1_0_Updated_With_Remarks.xlsx ---")
    c2 = ingest_unicat_lov(engine)
    summary["master_unicat_lov"] = c2

    print("\n--- [3/5] Ingesting Unilog_Master_UOM_Standards_Abbreviations_and_Terms.xlsx ---")
    c3_uom, c3_rules = ingest_uom_standards(engine)
    summary["master_uom_standards"] = c3_uom
    summary["master_house_style_rules"] = c3_rules

    print("\n--- [4/5] Ingesting Decimal_Fraction.xlsx ---")
    c4 = ingest_decimal_fractions(engine)
    summary["master_decimal_fractions"] = c4

    print("\n--- [5/5] Ingesting FAUCETS_LOV.xlsx ---")
    c5 = ingest_faucets_lov(engine)
    summary["master_faucets_lov"] = c5

    print("\n" + "=" * 80)
    print("INGESTION COMPLETE SUMMARY (Row counts loaded per table):")
    print("=" * 80)
    for table_name, count in summary.items():
        print(f"  - {table_name:<30}: {count:>8} rows loaded")
    print("=" * 80)

if __name__ == "__main__":
    main()
