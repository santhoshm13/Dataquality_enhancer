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

        def safe_str(v) -> str:
            """Coerce any value to a plain string, treating None/nan/NaN as empty."""
            if v is None:
                return ""
            s = str(v).strip()
            return "" if s.lower() in ("none", "nan", "null") else s

        def safe_dict(v) -> dict:
            """Return v if it is a dict, else an empty dict (guards against None / string)."""
            return v if isinstance(v, dict) else {}

        def safe_list(v) -> list:
            """Return v if it is a list, else an empty list."""
            return v if isinstance(v, list) else []

        # Pass-through raw input fields
        row["Mfg_Part_Num"] = safe_str(product.get("mfg_part_num"))
        row["Part_Desc"] = safe_str(product.get("raw_description"))
        row["E1_Brand"] = safe_str(product.get("raw_brand_e1"))
        row["Unilog_Brand"] = safe_str(product.get("raw_brand_unilog"))
        row["DIB_Brand"] = safe_str(product.get("raw_brand_dib"))
        row["Part_Manuf"] = safe_str(product.get("raw_manufacturer"))

        # BUG FIX: id may be None or a string from DB; coerce to int safely
        try:
            pid = int(product.get("id") or 1)
        except (ValueError, TypeError):
            pid = 1
        row["PART_NUMBER"] = f"{20000000 + pid}"
        row["SKU - MY_PART_NUMBER"] = f"{1500000 + pid}"
        row["MANUFACTURER_PART_NUMBER"] = safe_str(product.get("mfg_part_num"))

        enrich = safe_dict(product.get("enrichment"))
        row["MANUFACTURER_NAME"] = safe_str(enrich.get("manufacturer"))
        row["BRAND_NAME"] = safe_str(enrich.get("brand"))
        row["Dept"] = safe_str(enrich.get("department"))
        row["Class"] = safe_str(enrich.get("class"))
        row["Fine"] = safe_str(enrich.get("category"))
        row["Classpath"] = safe_str(enrich.get("classpath"))
        row["Product Name"] = safe_str(enrich.get("category"))

        descs = safe_dict(product.get("descriptions"))
        for d_key, d_val in descs.items():
            if d_key in row:
                row[d_key] = safe_str(d_val)

        attrs = safe_list(product.get("attributes"))
        for idx, attr in enumerate(attrs[:50]):
            if not isinstance(attr, dict):
                continue
            n = idx + 1
            row[f"ATTRIBUTE_LABEL {n}"] = safe_str(attr.get("name"))
            row[f"ATTRIBUTE_VALUE {n}"] = safe_str(attr.get("value"))
            row[f"ATTRIBUTE_UOM {n}"] = safe_str(attr.get("uom"))

        # --- Full record from extract_full_record (populated after page scrape) ---
        rec = safe_dict(product.get("full_record"))

        row["MFR URL"] = safe_str(rec.get("source_url")) or safe_str(product.get("source_url"))
        grounding_sources = safe_list(product.get("grounding_sources"))
        for i, url in enumerate(grounding_sources[:5]):
            row[f"Ref URL {i+1}"] = safe_str(url)

        row["TRADE_NAME"] = safe_str(rec.get("trade_name"))
        alt_pn = safe_list(rec.get("alternate_part_numbers"))
        row["ALTERNATE_PART_NUMBER"] = ", ".join(safe_str(p) for p in alt_pn) if alt_pn else ""

        features = safe_list(rec.get("item_features"))
        for i, feat in enumerate(features[:20]):
            row[f"ITEM_FEATURES_{i+1}"] = safe_str(feat)

        row["With"] = safe_str(rec.get("with_accessories"))
        row["Standard/Approvals"] = safe_str(rec.get("standards_approvals"))
        row["Prop 65"] = safe_str(rec.get("prop_65_warning"))
        row["Application"] = safe_str(rec.get("application"))
        row["Includes"] = safe_str(rec.get("includes"))

        ident = safe_dict(rec.get("identifiers"))
        row["UPC"] = safe_str(ident.get("upc"))
        row["EAN"] = safe_str(ident.get("ean"))
        row["GTIN"] = safe_str(ident.get("gtin"))
        row["UNSPSC"] = safe_str(ident.get("unspsc"))

        comm = safe_dict(rec.get("commerce"))
        row["Warranty"] = safe_str(comm.get("warranty"))
        row["List Price"] = safe_str(comm.get("list_price"))
        row["Selling Qty"] = safe_str(comm.get("selling_qty"))
        row["Selling UOM"] = safe_str(comm.get("selling_uom"))
        row["Standard Packaging Information"] = safe_str(comm.get("packaging_info"))

        dim = safe_dict(rec.get("dimensions"))
        for key, col in [
            ("length", "LENGTH"), ("length_uom", "LENGTH_UOM"),
            ("height", "HEIGHT"), ("height_uom", "HEIGHT_UOM"),
            ("width", "WIDTH"), ("width_uom", "WIDTH_UOM"),
            ("weight", "WEIGHT"), ("weight_uom", "WEIGHT_UOM"),
            ("volume", "VOLUME"), ("volume_uom", "VOLUME_UOM"),
        ]:
            row[col] = safe_str(dim.get(key))

        media = safe_dict(rec.get("media"))
        row["Product Image"] = safe_str(media.get("product_image"))
        alt_imgs = safe_list(media.get("alternate_images"))
        for i, img in enumerate(alt_imgs[:4]):
            row[f"Alternate Image {i+1}"] = safe_str(img)
        row["SDS"] = safe_str(media.get("sds_url"))
        row["SDS_1"] = safe_str(media.get("sds_url"))  # duplicate col in schema
        row["Warranty Information"] = safe_str(media.get("warranty_doc_url"))
        row["Catalog"] = safe_str(media.get("catalog_url"))
        row["Specification Sheet"] = safe_str(media.get("spec_sheet_url"))
        row["Instruction/Installation Manual"] = safe_str(media.get("install_manual_url"))
        row["Service Manual"] = safe_str(media.get("service_manual_url"))
        row["Owners/User Manual"] = safe_str(media.get("owners_manual_url"))
        row["Line Drawing"] = safe_str(media.get("line_drawing_url"))
        row["MTR"] = safe_str(media.get("mtr_url"))
        row["RoHS"] = safe_str(media.get("rohs_url"))
        row["Full Engineering Drawing"] = safe_str(media.get("engineering_drawing_url"))
        row["Energy Star Guide"] = safe_str(media.get("energy_star_url"))
        row["Technical Bulletin"] = safe_str(media.get("technical_bulletin_url"))
        row["Submittal"] = safe_str(media.get("submittal_url"))
        row["Compatibility Chart"] = safe_str(media.get("compatibility_chart_url"))
        row["Size Chart"] = safe_str(media.get("size_chart_url"))
        row["Product Label/Insert"] = safe_str(media.get("product_label_url"))
        row["Video Link"] = safe_str(media.get("video_url"))
        row["Video Link 1"] = safe_str(media.get("video_url_2"))

        row["Country Of Origin"] = safe_str(rec.get("country_of_origin"))
        row["Discontinued"] = safe_str(rec.get("discontinued"))
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