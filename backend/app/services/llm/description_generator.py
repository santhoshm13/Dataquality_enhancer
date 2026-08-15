import logging
from typing import Dict, Any, List

logger = logging.getLogger("app.services.descriptions")

CHARACTER_LIMITS = {
    "MOBILE_DESC": 40,
    "INVOICE_DESC": 30,
    "SHORT_DESC": 80,
    "LONG_DESC1": 1000,
    "RETAIL_DESC": 255,
    "MARKETING_DESCRIPTION": 500
}

class DescriptionGeneratorService:
    def generate_fact_grounded_descriptions(
        self,
        mfg_part_num: str,
        brand: str,
        manufacturer: str,
        category: str,
        validated_attributes: List[Dict[str, Any]],
        raw_description: str = ""
    ) -> Dict[str, str]:
        """
        Generates standard delivery-format descriptions strictly derived from validated product facts.
        Validates and truncates values according to strict schema character limits.
        """
        clean_brand = brand if brand and brand.lower() not in ["unbranded", "generic / unbranded"] else ""
        clean_mfg = manufacturer if manufacturer and manufacturer != "Unknown Manufacturer" else ""

        # Construct primary fact string
        prefix_parts = [p for p in [clean_brand, clean_mfg, mfg_part_num, category] if p]
        base_title = " ".join(prefix_parts) if prefix_parts else raw_description

        # Build attribute string summary
        attr_facts = []
        for attr in validated_attributes[:10]:
            a_name = attr.get("name") or attr.get("attribute_name", "")
            a_val = attr.get("value", "")
            a_uom = attr.get("uom", "")
            if a_name and a_val:
                unit_str = f" {a_uom}" if a_uom else ""
                attr_facts.append(f"{a_name}: {a_val}{unit_str}")

        attr_summary = ", ".join(attr_facts) if attr_facts else ""

        # 1. MOBILE_DESC (Max 40 chars)
        mob_raw = f"{clean_brand} {mfg_part_num} {category}".strip() if clean_brand else f"{mfg_part_num} {category}".strip()
        mobile_desc = mob_raw[:CHARACTER_LIMITS["MOBILE_DESC"]].strip()

        # 2. INVOICE_DESC (Max 30 chars)
        inv_raw = f"{mfg_part_num} {category}".strip()
        invoice_desc = inv_raw[:CHARACTER_LIMITS["INVOICE_DESC"]].strip()

        # 3. SHORT_DESC (Max 80 chars)
        short_raw = f"{base_title} - {attr_summary}".strip(" -")
        short_desc = short_raw[:CHARACTER_LIMITS["SHORT_DESC"]].strip()

        # 4. RETAIL_DESC (Max 255 chars)
        retail_raw = f"{base_title}. {attr_summary}".strip(". ")
        retail_desc = retail_raw[:CHARACTER_LIMITS["RETAIL_DESC"]].strip()

        # 5. MARKETING_DESCRIPTION (Max 500 chars)
        mkt_raw = f"High quality {base_title}. Built to industry standards. Specifications: {attr_summary}." if attr_summary else f"High quality {base_title}. Built to industry standards."
        marketing_desc = mkt_raw[:CHARACTER_LIMITS["MARKETING_DESCRIPTION"]].strip()

        # 6. LONG_DESC1 (Max 1000 chars)
        long_raw = f"{base_title}. Manufacturer Part Number: {mfg_part_num}. Features & Specifications: {attr_summary}." if attr_summary else f"{base_title}. Manufacturer Part Number: {mfg_part_num}."
        long_desc = long_raw[:CHARACTER_LIMITS["LONG_DESC1"]].strip()

        return {
            "MOBILE_DESC": mobile_desc,
            "INVOICE_DESC": invoice_desc,
            "SHORT_DESC": short_desc,
            "LONG_DESC1": long_desc,
            "RETAIL_DESC": retail_desc,
            "MARKETING_DESCRIPTION": marketing_desc
        }

description_generator = DescriptionGeneratorService()
