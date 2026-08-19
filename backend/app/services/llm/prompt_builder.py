"""Prompt builder utilities for attribute extraction and description generation."""

from typing import Dict, Any, List


def build_extraction_prompt(
    product_desc: str,
    category: str,
    part_num: str,
    classpath: str = "",
    manufacturer: str = "",
    brand: str = "",
    lov_entries: List[Any] | None = None,
) -> str:
    """
    Build a prompt for attribute extraction that includes the LOV-permitted attributes
    as constrained vocabulary.
    """
    # Build LOV text
    lov_lines = []
    for entry in lov_entries or []:
        uom = getattr(entry, "uom_standard", None) or getattr(entry, "unit_of_measure", None) or "N/A"
        vals = getattr(entry, "attribute_values", None)
        if vals:
            lov_lines.append(f"- {entry.attribute_label} (Permitted: {vals}, UOM: {uom})")
        else:
            lov_lines.append(f"- {entry.attribute_label} (UOM: {uom})")
    lov_text = "\n".join(lov_lines)

    prompt = f"""You are an AI assistant tasked with extracting product attributes from the given product description.
You must ONLY output attributes that are in the provided List of Values (LOV) for the product's classpath.

LOV attributes:
{lov_text}

Product description:
{product_desc}

Category:
{category}

Classpath:
{classpath}

Manufacturer:
{manufacturer}

Brand:
{brand}

Extract only the attributes that appear in the description. Return a strictly valid JSON object where each key is an attribute name and each value is an object with at least a 'value' field. Do NOT include any additional text or explanation."""
    return prompt.strip()


def build_description_prompt(context: Dict[str, Any]) -> str:
    """
    Build a prompt for generating descriptions based on validated attributes and UNILOG guidelines.
    """
    expected_keys = [
        "MOBILE_DESC",
        "INVOICE_DESC",
        "SHORT_DESC",
        "LONG_DESC1",
        "RETAIL_DESC",
        "MARKETING_DESCRIPTION",
    ]
    description_keys_section = ", ".join(expected_keys)

    prompt = f"""You are a product description generator following UNILOG INTERNAL CONTENT GUIDELINES.
Generate descriptions for the following keys: {description_keys_section}.
Only output a strictly valid JSON object where each key maps to a description string.
Do NOT include any additional text or explanation.
"""
    return prompt.strip()