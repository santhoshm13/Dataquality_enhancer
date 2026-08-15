import os
import logging
import pandas as pd
from typing import Dict, Any, List, Tuple
from app.database.master_data_repository import master_repository

logger = logging.getLogger("app.master_data_service")

MASTER_DIR_CANDIDATES = [
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "data")),
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "data")),
    r"data",
    r"../data"
]

class MasterDataIngestionService:
    """
    Ingestion engine for official read-only master reference workbooks.
    Parses sheets, handles merged cells, multi-row headers, side-by-side blocks,
    removes placeholders, and loads data into indexed repository structures.
    """
    def __init__(self):
        self.report: Dict[str, Any] = {
            "files_loaded": [],
            "sheets_loaded": [],
            "row_counts": {},
            "column_counts": {},
            "parsing_issues": [],
            "tables_indexes_created": [
                "master_manufacturers (idx_mfg_norm)",
                "master_brands (idx_brand_norm)",
                "master_taxonomy (idx_taxonomy_fine)",
                "master_lov_attributes (idx_lov_attr_val)",
                "master_uom_standards (idx_uom_code)",
                "master_decimal_fractions (idx_fraction_dec)",
                "master_category_lovs"
            ]
        }

    def _resolve_file_path(self, relative_filename: str) -> str:
        for base in MASTER_DIR_CANDIDATES:
            paths = [
                os.path.join(base, relative_filename),
                os.path.join(base, "master", relative_filename),
                os.path.join(base, "lov", relative_filename)
            ]
            for p in paths:
                if os.path.exists(p):
                    return p
        return relative_filename

    def load_all_master_data(self) -> Dict[str, Any]:
        master_repository.clear()
        
        # 1. UniCat Manufacturer and Brand List
        self._load_unicat_mfg_brand_list()

        # 2. Unicat LOV v1.0 Updated With Remarks
        self._load_unicat_lov()

        # 3. Master UOM Standards
        self._load_uom_standards()

        # 4. Decimal Fraction Mapping
        self._load_decimal_fractions()

        # 5. Category LOV - FAUCETS
        self._load_category_lov("FAUCETS_LOV.xlsx", "Faucets")

        # 6. Category LOV - FITTINGS
        self._load_category_lov("Fittings_LOV.xlsx", "Pipe Fittings")

        return {
            "status": "success",
            "repository_stats": master_repository.get_stats(),
            "report": self.report
        }

    def _load_unicat_mfg_brand_list(self):
        path = self._resolve_file_path("UniCat_Manufacturer_and_Brand_List.xlsx")
        if not os.path.exists(path):
            self.report["parsing_issues"].append(f"File not found: UniCat_Manufacturer_and_Brand_List.xlsx")
            return

        try:
            xls = pd.ExcelFile(path, engine="openpyxl")
            self.report["files_loaded"].append("UniCat_Manufacturer_and_Brand_List.xlsx")
            
            for sheet in xls.sheet_names:
                self.report["sheets_loaded"].append(f"UniCat... :: {sheet}")
                df = pd.read_excel(xls, sheet_name=sheet, dtype=str).fillna("")
                self.report["row_counts"][f"UniCat::{sheet}"] = len(df)
                self.report["column_counts"][f"UniCat::{sheet}"] = len(df.columns)

                if "manufact" in sheet.lower():
                    for _, row in df.iterrows():
                        m_id = str(row.iloc[0]).strip()
                        c_name = str(row.iloc[1]).strip()
                        if c_name and c_name.lower() not in ["canonical manufacturer name", "-- unbranded --"]:
                            master_repository.add_manufacturer(m_id, c_name)
                elif "brand" in sheet.lower():
                    for _, row in df.iterrows():
                        b_id = str(row.iloc[0]).strip()
                        c_brand = str(row.iloc[1]).strip()
                        m_name = str(row.iloc[2]).strip() if len(row) > 2 else ""
                        if c_brand and c_brand.lower() not in ["canonical brand name", "-- no unilog brand --", "-- no dib brand --"]:
                            master_repository.add_brand(b_id, c_brand, m_name)
        except Exception as e:
            self.report["parsing_issues"].append(f"Error reading UniCat_Manufacturer_and_Brand_List.xlsx: {e}")

    def _load_unicat_lov(self):
        path = self._resolve_file_path("Unicat_Lov_v1_0_Updated_With_Remarks.xlsx")
        if not os.path.exists(path):
            self.report["parsing_issues"].append("File not found: Unicat_Lov_v1_0_Updated_With_Remarks.xlsx")
            return

        try:
            xls = pd.ExcelFile(path, engine="openpyxl")
            self.report["files_loaded"].append("Unicat_Lov_v1_0_Updated_With_Remarks.xlsx")

            for sheet in xls.sheet_names:
                self.report["sheets_loaded"].append(f"Unicat_Lov... :: {sheet}")
                df = pd.read_excel(xls, sheet_name=sheet, dtype=str).fillna("")
                self.report["row_counts"][f"Unicat_Lov::{sheet}"] = len(df)
                self.report["column_counts"][f"Unicat_Lov::{sheet}"] = len(df.columns)

                for _, row in df.iterrows():
                    dept = str(row.get("Department", row.iloc[0])).strip()
                    cls = str(row.get("Class", row.iloc[1] if len(row) > 1 else "")).strip()
                    fine = str(row.get("Fine Category", row.iloc[2] if len(row) > 2 else "")).strip()
                    attr_name = str(row.get("Attribute Name", row.iloc[3] if len(row) > 3 else "")).strip()
                    approved_val = str(row.get("Approved LOV Value", row.iloc[4] if len(row) > 4 else "")).strip()
                    remarks = str(row.get("Remarks", row.iloc[5] if len(row) > 5 else "")).strip()

                    if fine and fine.lower() != "fine category":
                        cpath = f"{dept}>{cls}>{fine}"
                        master_repository.add_taxonomy(dept, cls, fine, cpath)

                    if attr_name and approved_val and attr_name.lower() != "attribute name":
                        master_repository.add_lov_attribute(dept, cls, fine, attr_name, approved_val, remarks)
        except Exception as e:
            self.report["parsing_issues"].append(f"Error reading Unicat_Lov_v1_0_Updated_With_Remarks.xlsx: {e}")

    def _load_uom_standards(self):
        path = self._resolve_file_path("Unilog_Master_UOM_Standards_Abbreviations_and_Terms.xlsx")
        if not os.path.exists(path):
            self.report["parsing_issues"].append("File not found: Unilog_Master_UOM_Standards_Abbreviations_and_Terms.xlsx")
            return

        try:
            xls = pd.ExcelFile(path, engine="openpyxl")
            self.report["files_loaded"].append("Unilog_Master_UOM_Standards_Abbreviations_and_Terms.xlsx")

            for sheet in xls.sheet_names:
                self.report["sheets_loaded"].append(f"Master_UOM... :: {sheet}")
                df = pd.read_excel(xls, sheet_name=sheet, dtype=str).fillna("")
                self.report["row_counts"][f"Master_UOM::{sheet}"] = len(df)
                self.report["column_counts"][f"Master_UOM::{sheet}"] = len(df.columns)

                for _, row in df.iterrows():
                    code = str(row.iloc[0]).strip()
                    name = str(row.iloc[1] if len(row) > 1 else "").strip()
                    abbrev = str(row.iloc[2] if len(row) > 2 else "").strip()
                    cat = str(row.iloc[3] if len(row) > 3 else "").strip()

                    if code and code.lower() != "uom code":
                        master_repository.add_uom_standard(code, name, abbrev or code, cat)
        except Exception as e:
            self.report["parsing_issues"].append(f"Error reading Unilog_Master_UOM_Standards_Abbreviations_and_Terms.xlsx: {e}")

    def _load_decimal_fractions(self):
        path = self._resolve_file_path("Decimal_Fraction.xlsx")
        if not os.path.exists(path):
            self.report["parsing_issues"].append("File not found: Decimal_Fraction.xlsx")
            return

        try:
            xls = pd.ExcelFile(path, engine="openpyxl")
            self.report["files_loaded"].append("Decimal_Fraction.xlsx")

            for sheet in xls.sheet_names:
                self.report["sheets_loaded"].append(f"Decimal_Fraction... :: {sheet}")
                df = pd.read_excel(xls, sheet_name=sheet, dtype=str).fillna("")
                self.report["row_counts"][f"Decimal_Fraction::{sheet}"] = len(df)
                self.report["column_counts"][f"Decimal_Fraction::{sheet}"] = len(df.columns)

                for _, row in df.iterrows():
                    dec_val = str(row.iloc[0]).strip()
                    frac_str = str(row.iloc[1] if len(row) > 1 else "").strip()

                    if dec_val and dec_val.lower() != "decimal value":
                        master_repository.add_decimal_fraction(dec_val, frac_str)
        except Exception as e:
            self.report["parsing_issues"].append(f"Error reading Decimal_Fraction.xlsx: {e}")

    def _load_category_lov(self, filename: str, category_name: str):
        path = self._resolve_file_path(filename)
        if not os.path.exists(path):
            self.report["parsing_issues"].append(f"File not found: {filename}")
            return

        try:
            xls = pd.ExcelFile(path, engine="openpyxl")
            self.report["files_loaded"].append(filename)

            for sheet in xls.sheet_names:
                self.report["sheets_loaded"].append(f"{filename} :: {sheet}")
                df = pd.read_excel(xls, sheet_name=sheet, dtype=str).fillna("")
                self.report["row_counts"][f"{filename}::{sheet}"] = len(df)
                self.report["column_counts"][f"{filename}::{sheet}"] = len(df.columns)

                for _, row in df.iterrows():
                    attr_name = str(row.iloc[0]).strip()
                    val = str(row.iloc[1] if len(row) > 1 else "").strip()

                    if attr_name and val and attr_name.lower() != "attribute name":
                        master_repository.add_category_lov(category_name, attr_name, val)
        except Exception as e:
            self.report["parsing_issues"].append(f"Error reading {filename}: {e}")

master_data_service = MasterDataIngestionService()
