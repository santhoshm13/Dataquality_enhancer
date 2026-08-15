import os
import pandas as pd
import logging
from app.database.master_data_repository import master_repository

logger = logging.getLogger("app.master_data_loader")

def load_master_data():
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
    master_dir = os.path.join(base_dir, "data", "master")
    
    logger.info("Starting Master Data Ingestion...")
    master_repository.clear()
    
    # 1. Load Manufacturers and Brands
    mfg_brand_file = os.path.join(master_dir, "UniCat_Manufacturer_and_Brand_List.xlsx")
    if os.path.exists(mfg_brand_file):
        try:
            xl = pd.ExcelFile(mfg_brand_file)
            if 'Manufacturers' in xl.sheet_names:
                df_mfg = xl.parse('Manufacturers').fillna('')
                for _, row in df_mfg.iterrows():
                    m_id = str(row.get('Manufacturer ID', ''))
                    m_name = str(row.get('Canonical Manufacturer Name', ''))
                    if m_name:
                        master_repository.add_manufacturer(m_id, m_name)
            
            if 'Brands' in xl.sheet_names:
                df_brand = xl.parse('Brands').fillna('')
                for _, row in df_brand.iterrows():
                    b_id = str(row.get('Brand ID', ''))
                    b_name = str(row.get('Canonical Brand Name', ''))
                    m_name = str(row.get('Manufacturer Name', ''))
                    if b_name:
                        master_repository.add_brand(b_id, b_name, m_name)
            logger.info(f"Loaded {len(master_repository.manufacturers)} Manufacturers and {len(master_repository.brands)} Brands")
        except Exception as e:
            logger.error(f"Failed to load Manufacturers/Brands: {e}")

    # 2. Load LOV
    lov_file = os.path.join(master_dir, "Unicat_Lov_v1_0_Updated_With_Remarks.xlsx")
    if os.path.exists(lov_file):
        try:
            df_lov = pd.read_excel(lov_file).fillna('')
            for _, row in df_lov.iterrows():
                dept = str(row.get('Department', ''))
                cls = str(row.get('Class', ''))
                fine = str(row.get('Fine Category', ''))
                attr = str(row.get('Attribute Name', ''))
                val = str(row.get('Approved LOV Value', ''))
                remarks = str(row.get('Remarks', ''))
                if attr and val:
                    master_repository.add_lov_attribute(dept, cls, fine, attr, val, remarks)
                    master_repository.add_category_lov(fine, attr, val)
                    
                # Build taxonomy if we don't have it
                classpath = f"{dept} > {cls} > {fine}"
                if fine and fine.lower() not in master_repository.idx_taxonomy_fine:
                    master_repository.add_taxonomy(dept, cls, fine, classpath)
                    
            logger.info(f"Loaded {len(master_repository.lov_attributes)} LOV attributes and {len(master_repository.taxonomy)} Taxonomy nodes")
        except Exception as e:
            logger.error(f"Failed to load LOV data: {e}")

    # 3. Load UOM
    uom_file = os.path.join(master_dir, "Unilog_Master_UOM_Standards_Abbreviations_and_Terms.xlsx")
    if os.path.exists(uom_file):
        try:
            df_uom = pd.read_excel(uom_file).fillna('')
            for _, row in df_uom.iterrows():
                code = str(row.get('UOM Code', ''))
                name = str(row.get('UOM Name', ''))
                abbrev = str(row.get('Standard Abbreviation', ''))
                cat = str(row.get('Category', ''))
                if code:
                    master_repository.add_uom_standard(code, name, abbrev, cat)
            logger.info(f"Loaded {len(master_repository.uom_standards)} UOM standards")
        except Exception as e:
            logger.error(f"Failed to load UOM data: {e}")

    # 4. Load Decimal Fractions
    dec_file = os.path.join(master_dir, "Decimal_Fraction.xlsx")
    if os.path.exists(dec_file):
        try:
            df_dec = pd.read_excel(dec_file).fillna('')
            for _, row in df_dec.iterrows():
                dec = str(row.get('Decimal Value', ''))
                frac = str(row.get('Fraction String', ''))
                if dec and frac:
                    master_repository.add_decimal_fraction(dec, frac)
            logger.info(f"Loaded {len(master_repository.decimal_fractions)} Decimal-Fraction conversions")
        except Exception as e:
            logger.error(f"Failed to load Decimal Fraction data: {e}")

    logger.info("Master Data Ingestion Complete.")
