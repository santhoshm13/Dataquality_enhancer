import io
import csv
import pandas as pd
from typing import Dict, Any, List

class DeliveryFormatGenerator:
    """
    Transforms internal normalized product structures into the hackathon 252-column delivery format.
    Supports CSV and Excel (.xlsx) exports using the identical 252-column schema.
    """
    def __init__(self, template_headers: List[str] = None):
        if not template_headers:
            # Standard 252 headers list
            self.headers = [
                "MFR URL", "Ref URL 1", "Ref URL 2", "Ref URL 3", "Ref URL 4", "Ref URL 5",
                "PART_NUMBER", "Dept", "Class", "Fine", "SKU - MY_PART_NUMBER", "Mfg_Part_Num",
                "Part_Desc", "E1_Brand", "Unilog_Brand", "DIB_Brand", "Part_Manuf", "MANUFACTURER_NAME",
                "BRAND_NAME", "TRADE_NAME", "MANUFACTURER_PART_NUMBER", "ALTERNATE_PART_NUMBER", "Classpath",
                "MOBILE_DESC", "INVOICE_DESC", "SHORT_DESC", "LONG_DESC1", "RETAIL_DESC", "MARKETING_DESCRIPTION",
                "ITEM_FEATURES_1", "ITEM_FEATURES_2", "ITEM_FEATURES_3", "ITEM_FEATURES_4", "ITEM_FEATURES_5",
                "ITEM_FEATURES_6", "ITEM_FEATURES_7", "ITEM_FEATURES_8", "ITEM_FEATURES_9", "ITEM_FEATURES_10",
                "ITEM_FEATURES_11", "ITEM_FEATURES_12", "ITEM_FEATURES_13", "ITEM_FEATURES_14", "ITEM_FEATURES_15",
                "ITEM_FEATURES_16", "ITEM_FEATURES_17", "ITEM_FEATURES_18", "ITEM_FEATURES_19", "ITEM_FEATURES_20",
                "With", "Standard/Approvals", "Prop 65", "Application", "Includes", "Product Name"
            ]
            # Add 50 dynamic attribute label/value/uom trios (150 columns)
            for i in range(1, 51):
                self.headers.extend([f"ATTRIBUTE_LABEL {i}", f"ATTRIBUTE_VALUE {i}", f"ATTRIBUTE_UOM {i}"])
            # Add commerce, dimension, asset, and metadata columns (47 columns)
            self.headers.extend([
                "UPC", "EAN", "GTIN", "UNSPSC", "Warranty", "List Price", "Selling Qty", "Selling UOM",
                "Standard Packaging Information", "LENGTH", "LENGTH_UOM", "HEIGHT", "HEIGHT_UOM",
                "WIDTH", "WIDTH_UOM", "WEIGHT", "WEIGHT_UOM", "VOLUME", "VOLUME_UOM", "Product Image",
                "Alternate Image 1", "Alternate Image 2", "Alternate Image 3", "Alternate Image 4",
                "SDS", "SDS_1", "Warranty Information", "Catalog", "Specification Sheet",
                "Instruction/Installation Manual", "Service Manual", "Owners/User Manual", "Line Drawing",
                "MTR", "RoHS", "Full Engineering Drawing", "Energy Star Guide", "Technical Bulletin",
                "Submittal", "Compatibility Chart", "Size Chart", "Product Label/Insert", "Video Link",
                "Video Link 1", "Country Of Origin", "Discontinued", "Actual Image (Yes/No)"
            ])
        else:
            self.headers = template_headers

    def format_product(self, product: Dict[str, Any]) -> Dict[str, str]:
        row = {h: "" for h in self.headers}
        
        # Raw pass-through fields
        row["Mfg_Part_Num"] = product.get("mfg_part_num", "")
        row["Part_Desc"] = product.get("raw_description", "")
        row["E1_Brand"] = product.get("raw_brand_e1", "")
        row["Unilog_Brand"] = product.get("raw_brand_unilog", "")
        row["DIB_Brand"] = product.get("raw_brand_dib", "")
        row["Part_Manuf"] = product.get("raw_manufacturer", "")
        
        # Generated internal SKUs
        pid = product.get("id", 1)
        row["PART_NUMBER"] = f"{20000000 + pid}"
        row["SKU - MY_PART_NUMBER"] = f"{1500000 + pid}"
        row["MANUFACTURER_PART_NUMBER"] = product.get("mfg_part_num", "")
        
        # Enrichment & Taxonomy
        enrich = product.get("enrichment", {})
        row["MANUFACTURER_NAME"] = enrich.get("manufacturer") or ""
        row["BRAND_NAME"] = enrich.get("brand") or ""
        row["Dept"] = enrich.get("department") or ""
        row["Class"] = enrich.get("class") or ""
        row["Fine"] = enrich.get("category") or ""
        row["Classpath"] = enrich.get("classpath") or ""
        row["Product Name"] = enrich.get("category") or ""

        # AI Descriptions
        descs = product.get("descriptions", {})
        for d_key, d_val in descs.items():
            if d_key in row:
                row[d_key] = d_val

        # Dynamic Attributes (Trios 1 to 50)
        attrs = product.get("attributes", [])
        for idx, attr in enumerate(attrs[:50]):
            n = idx + 1
            row[f"ATTRIBUTE_LABEL {n}"] = attr.get("name", "")
            row[f"ATTRIBUTE_VALUE {n}"] = attr.get("value", "")
            row[f"ATTRIBUTE_UOM {n}"] = attr.get("uom") or ""

        # Derived fields
        row["Actual Image (Yes/No)"] = "Yes" if row.get("Product Image") else "No"
        
        return row

    def generate_csv_string(self, products: List[Dict[str, Any]]) -> str:
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=self.headers)
        writer.writeheader()
        for p in products:
            writer.writerow(self.format_product(p))
        return output.getvalue()

    def generate_excel_bytes(self, products: List[Dict[str, Any]]) -> bytes:
        rows = [self.format_product(p) for p in products]
        df = pd.DataFrame(rows, columns=self.headers)
        
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="Delivery Format")
        return output.getvalue()

delivery_generator = DeliveryFormatGenerator()
