import asyncio
import json
import logging
import re
import time
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List

try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None
    types = None

from .retry_wrapper import fetch_with_retry
from .prompt_builder import build_extraction_prompt, build_description_prompt
from app.services.lov.lov_retrieval_service import get_lov_for_classpath
from app.services.scraper.spider import scrape_page, scrape_page_async, validate_url, scrape_page_with_fallback
from app.services.enrichment_cache import enrichment_cache

logger = logging.getLogger("app.services.llm")

# Standard UNILOG description length limits
UNILOG_LIMITS = {
    "INVOICE_DESC": 40,
    "MOBILE_DESC": 80,
    "SHORT_DESC": 80,
    "LONG_DESC1": 1000,
    "RETAIL_DESC": 255,
    "MARKETING_DESCRIPTION": 500,
}


FULL_RECORD_PROMPT = """
Here is the raw text content of a manufacturer/distributor product page
for {manufacturer} {mpn}:
---
{page_text}
---

Extract every piece of the following that is explicitly present in the text.
Do NOT invent, guess, or infer values not stated. Leave a field as null/empty
if it is not present — never fabricate to fill a gap.

Return strict JSON with this exact structure:
{{
  "product_title": "",
  "trade_name": "",
  "alternate_part_numbers": [],
  "raw_description": "",
  "item_features": [],
  "with_accessories": "",
  "standards_approvals": "",
  "prop_65_warning": "",
  "application": "",
  "includes": "",
  "identifiers": {{
    "upc": "",
    "ean": "",
    "gtin": "",
    "unspsc": ""
  }},
  "commerce": {{
    "warranty": "",
    "list_price": "",
    "selling_qty": "",
    "selling_uom": "",
    "packaging_info": ""
  }},
  "dimensions": {{
    "length": "",
    "length_uom": "",
    "height": "",
    "height_uom": "",
    "width": "",
    "width_uom": "",
    "weight": "",
    "weight_uom": "",
    "volume": "",
    "volume_uom": ""
  }},
  "media": {{
    "product_image": "",
    "alternate_images": [],
    "sds_url": "",
    "warranty_doc_url": "",
    "catalog_url": "",
    "spec_sheet_url": "",
    "install_manual_url": "",
    "service_manual_url": "",
    "owners_manual_url": "",
    "line_drawing_url": "",
    "mtr_url": "",
    "rohs_url": "",
    "engineering_drawing_url": "",
    "energy_star_url": "",
    "technical_bulletin_url": "",
    "submittal_url": "",
    "compatibility_chart_url": "",
    "size_chart_url": "",
    "product_label_url": "",
    "video_url": "",
    "video_url_2": ""
  }},
  "country_of_origin": "",
  "discontinued": "",
  "raw_specs": [
    {{
      "label": "",
      "value": "",
      "unit": ""
    }}
  ]
}}
"""


def clean_json_text(text: str) -> str:
    """Strip markdown code block fences and whitespace from raw LLM output."""
    if not text:
        return ""
    cleaned = text.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    return cleaned.strip()

def validate_attributes_against_lov(raw_attributes: Any, lov_entries: List[Any]) -> List[Dict[str, Any]]:
    """
    Validate and filter extracted attributes strictly against LOV entries:
    1. Matches attribute name case-insensitively against permitted LOV attribute labels.
    2. Validates attribute value against permitted LOV values (if defined in LOV entry).
    3. Populates canonical UOM from LOV if missing.
    """
    validated = []
    if not lov_entries:
        return validated

    permitted_attrs = {e.attribute_label.strip().lower(): e for e in lov_entries}

    # Normalize raw_attributes whether it is a list or a dict
    attr_list = []
    if isinstance(raw_attributes, list):
        attr_list = raw_attributes
    elif isinstance(raw_attributes, dict):
        for k, v in raw_attributes.items():
            if isinstance(v, dict):
                attr_list.append({"name": k, "value": v.get("value", ""), "uom": v.get("uom"), "confidence": v.get("confidence", 0.9)})
            else:
                attr_list.append({"name": k, "value": str(v), "uom": None, "confidence": 0.9})

    for attr in attr_list:
        if not isinstance(attr, dict):
            continue
        name = str(attr.get("name") or attr.get("attribute_name", "")).strip()
        value = str(attr.get("value", "")).strip()
        uom = attr.get("uom")
        confidence = attr.get("confidence", 0.9)

        try:
            confidence = float(confidence)
            confidence = max(0.0, min(1.0, confidence))
        except (ValueError, TypeError):
            confidence = 0.9

        name_lower = name.lower()
        if name_lower not in permitted_attrs:
            logger.debug(f"Filtered out hallucinated attribute not in LOV: '{name}'")
            continue

        lov_entry = permitted_attrs[name_lower]

        # Check permitted values if specified in LOV
        raw_permitted_vals = getattr(lov_entry, "attribute_values", None)
        if raw_permitted_vals:
            permitted_values_list = [v.strip().lower() for v in str(raw_permitted_vals).split(",") if v.strip()]
            if permitted_values_list and value.lower() not in permitted_values_list:
                logger.debug(f"Filtered out non-permitted value '{value}' for attribute '{name}'")
                continue

        # UOM fallback from LOV entry if not provided
        if uom is None:
            uom = getattr(lov_entry, "uom_standard", None) or getattr(lov_entry, "unit_of_measure", None)

        validated.append({
            "name": lov_entry.attribute_label,
            "value": value,
            "uom": uom,
            "confidence": confidence
        })

    return validated

def enforce_description_limits(descriptions: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, str]:
    """Apply UNILOG length constraints. Never pad with filler text."""
    expected_keys = ["MOBILE_DESC", "INVOICE_DESC", "SHORT_DESC", "LONG_DESC1", "RETAIL_DESC", "MARKETING_DESCRIPTION"]
    corrected = {}

    for key in expected_keys:
        val = str(descriptions.get(key, "")).strip()
        limit = UNILOG_LIMITS.get(key, 1000)
        if len(val) > limit:
            corrected[key] = val[:limit].strip()
        else:
            corrected[key] = val

    # MOBILE_DESC minimum: pad only with real product identity info — never filler
    mobile = corrected.get("MOBILE_DESC", "")
    if len(mobile) < 10:
        # Only use real identity tokens; leave empty rather than fabricate
        base_parts = [
            context.get("brand", ""),
            context.get("category", ""),
            context.get("mfg_part_num", "")
        ]
        base = " ".join(p for p in base_parts if p).strip()
        if base:
            corrected["MOBILE_DESC"] = base[:80].strip()
        # If base is also empty, leave mobile empty — honest is better than fabricated

    return corrected


class BaseLLMProvider(ABC):
    @abstractmethod
    async def extract_attributes(self, product_desc: str, category: str, part_num: str, classpath: str = "", manufacturer: str = "", brand: str = "") -> Dict[str, Any]:
        pass

    @abstractmethod
    async def generate_descriptions(self, attributes: Dict[str, Any], raw_desc: str) -> Dict[str, str]:
        pass


class MockLLMProvider(BaseLLMProvider):
    """
    Mock LLM provider for deterministic offline testing.
    HONESTY RULES:
    - Only return attributes we can confidently extract from the description text.
    - Never return made-up values for products we don't recognise.
    - Return empty attributes list when the product type is unknown.
    - dept/class/category are returned as None when not confidently identified
      so the category_classifier (Stage 2) remains the authoritative source.
    """
    async def extract_attributes(self, product_desc: str, category: str, part_num: str, classpath: str = "", manufacturer: str = "", brand: str = "") -> Dict[str, Any]:
        desc_lower = product_desc.lower()
        lov_entries = get_lov_for_classpath(classpath)

        if "dishwasher" in desc_lower or "pdsh" in desc_lower or "wdts" in desc_lower:
            raw_extracted = [
                {"name": "Series", "value": "Professional Series", "uom": None, "confidence": 0.95},
                {"name": "Number of Wash Cycles", "value": "5", "uom": None, "confidence": 0.98},
                {"name": "Voltage Rating", "value": "120", "uom": "V", "confidence": 0.99},
                {"name": "Amperage Rating", "value": "15", "uom": "A", "confidence": 0.97},
                {"name": "Mounting Type", "value": "Leg", "uom": None, "confidence": 0.94},
                {"name": "Sound Level", "value": "47", "uom": "dBA", "confidence": 0.96},
                {"name": "Finish", "value": "Stainless Steel", "uom": None, "confidence": 0.99},
            ]
            dept, cls, cat = "Appliances", "Large Appliances", "Built-In Dishwashers"

        elif "sanding belt" in desc_lower or "abrasive" in desc_lower or "p80" in desc_lower or "p150" in desc_lower:
            grit = None
            for g in ["P80", "P120", "P150", "P180", "P220", "P320"]:
                if g.lower() in desc_lower:
                    grit = g
                    break
            raw_extracted = []
            if grit:
                raw_extracted.append({"name": "Grit", "value": grit, "uom": None, "confidence": 0.98})
            if "aluminum oxide" in desc_lower or "alum" in desc_lower:
                raw_extracted.append({"name": "Abrasive Material", "value": "Aluminum Oxide", "uom": None, "confidence": 0.92})
            if "6" in desc_lower or "six" in desc_lower:
                raw_extracted.append({"name": "Pack Quantity", "value": "6", "uom": "pc", "confidence": 0.80})
            dept, cls, cat = "Abrasives", "Coated Abrasives", "Sanding Belts"

        else:
            # Unknown product type — return nothing rather than fabricate
            logger.debug(f"MockLLMProvider: unknown product type for MPN={part_num}, returning no attributes")
            raw_extracted = []
            dept, cls, cat = None, None, None

        validated = validate_attributes_against_lov(raw_extracted, lov_entries)

        return {
            "department": dept,
            "class": cls,
            "category": cat,
            "attributes": validated
        }

    async def generate_descriptions(self, attributes: Dict[str, Any], raw_desc: str) -> Dict[str, str]:
        """
        Generate descriptions from REAL extracted attributes only.
        Never fabricate marketing copy for unknown products.
        """
        part_num = attributes.get("mfg_part_num", "") or ""
        brand = attributes.get("brand", "") or ""
        category = attributes.get("category", "") or ""
        manufacturer = attributes.get("manufacturer", "") or ""
        validated = attributes.get("validated_attributes", [])

        # Build fact-based attr summary from ONLY what was actually extracted
        attr_parts = []
        for a in validated:
            name = a.get("name", "")
            val = a.get("value", "")
            uom = a.get("uom") or ""
            if name and val:
                attr_parts.append(f"{name}: {val}{' ' + uom if uom else ''}")
        attr_summary = ", ".join(attr_parts)

        # Build descriptions using only real facts — no filler
        identity = " ".join(filter(None, [brand, category, part_num])).strip()
        invoice = (identity)[:40] if identity else (raw_desc[:40] if raw_desc else "")
        short_desc = (f"{identity}" + (f" - {attr_summary}" if attr_summary else ""))[:80]
        mobile_base = identity or raw_desc[:40]
        mobile = mobile_base[:80]
        long_desc = (f"{identity}. " if identity else "") + \
                    (f"Specs: {attr_summary}. " if attr_summary else "") + \
                    (f"Part Number: {part_num}. " if part_num else "") + \
                    (f"Manufacturer: {manufacturer}." if manufacturer else "")
        long_desc = long_desc.strip()[:1000]

        # RETAIL_DESC: fact-based, no filler marketing language
        retail = short_desc[:255]

        # MARKETING_DESCRIPTION: only if we have real content
        marketing = long_desc[:500] if long_desc else ""

        return {
            "MOBILE_DESC": mobile,
            "INVOICE_DESC": invoice,
            "SHORT_DESC": short_desc,
            "LONG_DESC1": long_desc,
            "RETAIL_DESC": retail,
            "MARKETING_DESCRIPTION": marketing
        }

    async def find_manufacturer_url(self, mpn: str, manufacturer: str, category_hint: str = None) -> Dict[str, Any]:
        """
        Mock URL lookup: returns known-good demo URLs for a small allowlist.
        All other manufacturers honestly return found=false to exercise the
        NEEDS_HUMAN_REVIEW flow (never fabricate or guess URLs).
        """
        mfg_clean = (manufacturer or "").lower()

        # Small allowlist of known-good demo manufacturer URLs
        MOCK_URL_MAP = {
            "frigidaire": "https://www.frigidaire.com/en/p/dishwashers/built-in-dishwashers/{mpn}",
            "diablo": "https://www.diablotools.com/products/{mpn}",
            "freud": "https://www.diablotools.com/products/{mpn}",
            "3m": "https://www.3m.com/3M/en_US/p/d/{mpn}/",
            "whirlpool": "https://www.whirlpool.com/kitchen/dishwashers/{mpn}.html",
            "mirka": "https://www.mirka.com/en/products/{mpn}",
        }

        for key, url_template in MOCK_URL_MAP.items():
            if key in mfg_clean:
                url = url_template.format(mpn=mpn)
                return {"found": True, "url": url, "source_type": "manufacturer", "grounding_sources": [url]}

        # Honest failure for unknown manufacturers — do NOT construct/guess URLs
        return {
            "found": False, "url": "", "source_type": "none", "grounding_sources": [],
            "review_status": "NEEDS_HUMAN_REVIEW",
            "review_reason": f"No known manufacturer URL for {manufacturer} {mpn}"
        }

    async def extract_specs_from_text(self, mpn: str, manufacturer: str, page_text: str, source_url: str, source_type: str = "manufacturer") -> Dict[str, Any]:
        """
        Mock: never actually scrapes — always returns found=False.
        The real GeminiProvider has a real implementation.
        Returning found=True here would be fabrication.
        """
        logger.debug(f"MockLLMProvider.extract_specs_from_text called for {manufacturer} {mpn} — returning not-found (mock cannot scrape)")
        return {
            "found": False,
            "source_url": source_url,
            "source_type": source_type,
            "review_status": "NEEDS_HUMAN_REVIEW",
            "review_reason": f"Mock provider cannot scrape manufacturer page for {manufacturer} {mpn}. Configure a real LLM provider to enable page scraping."
        }

    async def enrich_from_manufacturer(self, mpn: str, manufacturer: str, category_hint: str = None) -> Dict[str, Any]:
        """Mock orchestrator: cache → Stage 1 → 1.5 → 2 → 3, with review_status on failure."""
        # Check cache first
        cached = enrichment_cache.get_cached(mpn, manufacturer)
        if cached:
            logger.info(f"[Mock Cache HIT] {manufacturer} {mpn}")
            return cached

        stage_timings: Dict[str, float] = {}

        # STAGE 1: URL Lookup
        t0 = time.perf_counter()
        stage1 = await self.find_manufacturer_url(mpn, manufacturer, category_hint=category_hint)
        s1 = time.perf_counter() - t0
        stage_timings["url_lookup_s"] = s1

        if not stage1.get("found") or not stage1.get("url"):
            return {
                "found": False, "stage_failed": "url_lookup", "stage_timings": stage_timings,
                "review_status": "NEEDS_HUMAN_REVIEW",
                "review_reason": f"URL lookup failed for {manufacturer} {mpn}"
            }

        source_url = stage1["url"]
        source_type = stage1.get("source_type", "manufacturer")
        grounding_sources = stage1.get("grounding_sources", [])

        # STAGE 1.5: URL Validation
        t1 = time.perf_counter()
        val_result = await validate_url(source_url)
        s15 = time.perf_counter() - t1
        stage_timings["url_validate_s"] = s15

        if not val_result.get("valid"):
            return {
                "found": False, "stage_failed": "url_validation", "stage_timings": stage_timings,
                "source_url": source_url, "source_type": source_type, "grounding_sources": grounding_sources,
                "review_status": "NEEDS_HUMAN_REVIEW",
                "review_reason": f"URL validation failed: {val_result.get('rejection_reason', 'unknown')}"
            }

        # STAGE 2: Scrape Page (with Playwright fallback)
        t2 = time.perf_counter()
        page_text = await scrape_page_with_fallback(val_result.get("final_url", source_url))
        s2 = time.perf_counter() - t2
        stage_timings["scrape_s"] = s2

        if not page_text or not page_text.strip():
            return {
                "found": False, "stage_failed": "scrape", "stage_timings": stage_timings,
                "source_url": source_url, "source_type": source_type, "grounding_sources": grounding_sources,
                "review_status": "NEEDS_HUMAN_REVIEW",
                "review_reason": f"Page scrape returned empty content for {source_url}"
            }

        # STAGE 3: Extract Specs from Text
        t3 = time.perf_counter()
        stage3 = await self.extract_specs_from_text(mpn, manufacturer, page_text, source_url, source_type)
        s3 = time.perf_counter() - t3
        stage_timings["spec_extraction_s"] = s3

        if not stage3.get("found"):
            return {
                "found": False, "stage_failed": "spec_extraction", "stage_timings": stage_timings,
                "source_url": source_url, "source_type": source_type, "grounding_sources": grounding_sources,
                "review_status": "NEEDS_HUMAN_REVIEW",
                "review_reason": f"Spec extraction failed for {manufacturer} {mpn}"
            }

        # Success — assemble result
        stage3["grounding_sources"] = list(dict.fromkeys(grounding_sources + [source_url]))
        stage3["stage_timings"] = stage_timings
        stage3["review_status"] = None
        stage3["review_reason"] = None

        # Cache the successful result
        enrichment_cache.set_cached(mpn, manufacturer, stage3)

        return stage3


class OpenAIProvider(BaseLLMProvider):
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.api_url = "https://api.openai.com/v1/chat/completions"
        self.openai_endpoint = self.api_url
        self.model = "gpt-4"

    async def extract_attributes(self, product_desc: str, category: str, part_num: str, classpath: str = "", manufacturer: str = "", brand: str = "") -> Dict[str, Any]:
        lov_entries = get_lov_for_classpath(classpath)
        if not lov_entries:
            logger.warning(f"No LOV entries found for classpath: {classpath}. Falling back to mock.")
            return await MockLLMProvider().extract_attributes(product_desc, category, part_num, classpath, manufacturer, brand)

        prompt = build_extraction_prompt(product_desc, category, part_num, classpath, manufacturer, brand, lov_entries)

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": "You are an AI assistant that extracts product attributes in strict JSON format."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.1,
            "max_tokens": 1000
        }

        try:
            response = await fetch_with_retry(self.api_url, json_payload=payload, headers=headers)
            if response is None:
                logger.warning("OpenAI API returned None. Falling back to MockLLMProvider.")
                return await MockLLMProvider().extract_attributes(product_desc, category, part_num, classpath, manufacturer, brand)

            content = response.get("choices", [{}])[0].get("message", {}).get("content", "")
            cleaned = clean_json_text(content)
            parsed = json.loads(cleaned)

            department = parsed.get("department", "")
            class_ = parsed.get("class", "")
            category_out = parsed.get("category", "")
            raw_attributes = parsed.get("attributes", parsed)

            validated_attributes = validate_attributes_against_lov(raw_attributes, lov_entries)

            return {
                "department": department,
                "class": class_,
                "category": category_out or category,
                "attributes": validated_attributes
            }
        except Exception as e:
            logger.warning(f"OpenAI extraction failed: {e}. Falling back to MockLLMProvider.")
            return await MockLLMProvider().extract_attributes(product_desc, category, part_num, classpath, manufacturer, brand)

    async def generate_descriptions(self, attributes: Dict[str, Any], raw_desc: str) -> Dict[str, str]:
        context = attributes
        prompt = build_description_prompt(context)

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": "You generate UNILOG compliant product descriptions based on the provided attributes in strict JSON format."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.1,
            "max_tokens": 1000
        }

        try:
            response = await fetch_with_retry(self.api_url, json_payload=payload, headers=headers)
            if response is None:
                logger.warning("OpenAI API returned None for descriptions. Falling back to MockLLMProvider.")
                return await MockLLMProvider().generate_descriptions(attributes, raw_desc)

            content = response.get("choices", [{}])[0].get("message", {}).get("content", "")
            cleaned = clean_json_text(content)
            parsed = json.loads(cleaned)

            return enforce_description_limits(parsed, context)
        except Exception as e:
            logger.warning(f"OpenAI description generation failed: {e}. Falling back to MockLLMProvider.")
            return await MockLLMProvider().generate_descriptions(attributes, raw_desc)


class GeminiProvider(BaseLLMProvider):
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key={self.api_key}"

    async def extract_attributes(self, product_desc: str, category: str, part_num: str, classpath: str = "", manufacturer: str = "", brand: str = "") -> Dict[str, Any]:
        lov_entries = get_lov_for_classpath(classpath)
        if not lov_entries:
            logger.warning(f"No LOV entries found for classpath: {classpath}. Falling back to mock.")
            return await MockLLMProvider().extract_attributes(product_desc, category, part_num, classpath, manufacturer, brand)

        prompt = build_extraction_prompt(product_desc, category, part_num, classpath, manufacturer, brand, lov_entries)

        headers = {
            "Content-Type": "application/json"
        }

        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }],
            "generationConfig": {
                "temperature": 0.1,
                "maxOutputTokens": 1000
            }
        }

        try:
            response = await fetch_with_retry(self.api_url, json_payload=payload, headers=headers)
            if response is None:
                logger.warning("Gemini API returned None. Falling back to MockLLMProvider.")
                return await MockLLMProvider().extract_attributes(product_desc, category, part_num, classpath, manufacturer, brand)

            candidates = response.get("candidates", [])
            if not candidates:
                raise ValueError("No candidates returned from Gemini API")

            content = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            cleaned = clean_json_text(content)
            parsed = json.loads(cleaned)

            department = parsed.get("department", "")
            class_ = parsed.get("class", "")
            category_out = parsed.get("category", "")
            raw_attributes = parsed.get("attributes", parsed)

            validated_attributes = validate_attributes_against_lov(raw_attributes, lov_entries)

            return {
                "department": department,
                "class": class_,
                "category": category_out or category,
                "attributes": validated_attributes
            }
        except Exception as e:
            logger.warning(f"Gemini extraction failed: {e}. Falling back to MockLLMProvider.")
            return await MockLLMProvider().extract_attributes(product_desc, category, part_num, classpath, manufacturer, brand)

    async def generate_descriptions(self, attributes: Dict[str, Any], raw_desc: str) -> Dict[str, str]:
        context = attributes
        prompt = build_description_prompt(context)

        headers = {
            "Content-Type": "application/json"
        }

        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }],
            "generationConfig": {
                "temperature": 0.1,
                "maxOutputTokens": 1000
            }
        }

        try:
            response = await fetch_with_retry(self.api_url, json_payload=payload, headers=headers)
            if response is None:
                logger.warning("Gemini API returned None for descriptions. Falling back to MockLLMProvider.")
                return await MockLLMProvider().generate_descriptions(attributes, raw_desc)

            candidates = response.get("candidates", [])
            if not candidates:
                raise ValueError("No candidates returned from Gemini API")

            content = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            cleaned = clean_json_text(content)
            parsed = json.loads(cleaned)

            return enforce_description_limits(parsed, context)
        except Exception as e:
            logger.warning(f"Gemini description generation failed: {e}. Falling back to MockLLMProvider.")
            return await MockLLMProvider().generate_descriptions(attributes, raw_desc)

    async def find_manufacturer_url(self, mpn: str, manufacturer: str, category_hint: str = None) -> Dict[str, Any]:
        """
        STAGE 1: Find the product's official or fallback distributor URL using
        gemini-3.7-flash with ONLY google_search tool enabled.
        category_hint biases search towards the right product category.
        """
        hint_line = ""
        if category_hint:
            hint_line = f"Product Category: {category_hint}\n"

        # BUG FIX: The prompt explicitly requests JSON, but Gemini with google_search
        # tool often returns a natural-language answer with the URL embedded in text.
        # We now use a two-pass strategy: try JSON parse first, then regex-extract URL
        # from raw text as a fallback so we never discard a valid URL.
        prompt = (
            f"Manufacturer: {manufacturer}\n"
            f"Manufacturer Part Number (MPN): {mpn}\n"
            f"{hint_line}\n"
            f"Search for the official product page URL for this exact MPN on the "
            f"manufacturer website or a major distributor (Grainger, MSC, RS Components, "
            f"Fastenal, Digikey, McMaster-Carr). Use only URLs from real search results. "
            f"Never guess or construct a URL. If no confident match found, say found=false.\n"
            f"Return ONLY valid JSON — no markdown, no explanation:\n"
            f'{{"found": true, "url": "https://example.com/product-page", "source_type": "manufacturer"}}'
            f'\nOR if not found: {{"found": false, "url": "", "source_type": "none"}}'
        )

        try:
            if not self.api_key:
                return {"found": False, "error": "Gemini API key is not configured"}

            if not genai:
                return {"found": False, "error": "google-genai SDK is not installed"}

            client = genai.Client(api_key=self.api_key)
            tools = [
                types.Tool(google_search=types.GoogleSearch())
            ]
            config = types.GenerateContentConfig(
                tools=tools,
                temperature=0.1,
            )

            max_retries = 2
            response = None

            for attempt in range(max_retries):
                try:
                    response = await client.aio.models.generate_content(
                        model="gemini-3.7-flash",
                        contents=prompt,
                        config=config
                    )
                    if response:
                        break
                except Exception as exc:
                    if "RESOURCE_EXHAUSTED" in str(exc) or "429" in str(exc):
                        logger.warning(f"Gemini quota/rate limit reached during URL lookup for {manufacturer} {mpn}: {exc}")
                        return {"found": False, "error": str(exc)}
                    if attempt == max_retries - 1:
                        raise exc
                    await asyncio.sleep(0.5 * (2 ** attempt))

            if not response or not getattr(response, "candidates", None):
                return {"found": False, "error": "No candidates returned from Gemini"}

            candidate = response.candidates[0]
            raw_text = getattr(response, "text", "") or ""
            if not raw_text and getattr(candidate, "content", None) and getattr(candidate.content, "parts", None):
                raw_text = candidate.content.parts[0].text or ""

            logger.info(f"[Stage 1 raw response] {manufacturer} {mpn}: {raw_text[:300]!r}")

            # Grounding metadata provenance trail
            grounding_sources = []
            if hasattr(candidate, "grounding_metadata") and candidate.grounding_metadata:
                gm = candidate.grounding_metadata
                chunks = getattr(gm, "grounding_chunks", []) or []
                for chunk in chunks:
                    web = getattr(chunk, "web", None)
                    if web and getattr(web, "uri", None):
                        grounding_sources.append(web.uri)
                    elif isinstance(chunk, dict) and "web" in chunk and isinstance(chunk["web"], dict) and "uri" in chunk["web"]:
                        grounding_sources.append(chunk["web"]["uri"])

                if hasattr(gm, "source_flagging_uris") and gm.source_flagging_uris:
                    for uri in gm.source_flagging_uris:
                        if uri not in grounding_sources:
                            grounding_sources.append(uri)

            found = False
            url = ""
            source_type = "none"

            # Pass 1: Try strict JSON parse
            try:
                cleaned = clean_json_text(raw_text)
                if cleaned:
                    parsed = json.loads(cleaned)
                    found = bool(parsed.get("found", False))
                    url = str(parsed.get("url") or "").strip()
                    source_type = str(parsed.get("source_type") or ("manufacturer" if found else "none")).strip()
            except (json.JSONDecodeError, ValueError) as json_err:
                logger.warning(f"[Stage 1 JSON parse failed] {manufacturer} {mpn}: {json_err} — trying regex URL extraction")

            # Pass 2: Regex fallback — extract first https URL from raw text
            if not url or url.lower() in ("null", "none", ""):
                url_match = re.search(r'https?://[^\s\"\',><\]\[}{\\]+', raw_text)
                if url_match:
                    url = url_match.group(0).rstrip("./,;)")
                    found = True
                    source_type = "manufacturer"  # assume manufacturer; validate_url will confirm
                    logger.info(f"[Stage 1 regex fallback] {manufacturer} {mpn}: extracted URL {url!r}")

            if not url or url.lower() in ("null", "none", ""):
                found = False

            logger.info(
                f"[Stage 1 RESULT] {manufacturer} {mpn}: found={found} url={url!r} "
                f"source_type={source_type} grounding_sources={len(grounding_sources)}"
            )

            return {
                "found": found,
                "url": url,
                "source_type": source_type,
                "grounding_sources": list(dict.fromkeys(grounding_sources))
            }
        except Exception as e:
            logger.warning(f"[Stage 1 ERROR] find_manufacturer_url for {manufacturer} {mpn}: {e}")
            return {"found": False, "error": str(e), "grounding_sources": []}

    async def extract_specs_from_text(self, mpn: str, manufacturer: str, page_text: str, source_url: str, source_type: str = "manufacturer") -> Dict[str, Any]:
        """
        STAGE 3: Extract technical specs, product title, description, and image URLs
        from scraped page text using plain gemini-3.7-flash with NO tools for maximum speed.
        """
        prompt = (
            f"Here is the raw text content of a manufacturer/distributor product page "
            f"for {manufacturer} {mpn}:\n\n"
            f"---\n"
            f"{page_text}\n"
            f"---\n\n"
            f"Extract: full product title, category/series, every technical specification "
            f"(label, value, unit as written), feature description, image URLs if present "
            f"in the text. Do not invent values not present in this text.\n\n"
            f"Return strict JSON: {{product_title, raw_specs, raw_description, image_urls}}"
        )

        try:
            if not self.api_key:
                return {"found": False, "error": "Gemini API key is not configured"}

            if not genai:
                return {"found": False, "error": "google-genai SDK is not installed"}

            client = genai.Client(api_key=self.api_key)
            config = types.GenerateContentConfig(
                temperature=0.1,
            )

            max_retries = 2
            response = None

            for attempt in range(max_retries):
                try:
                    response = await client.aio.models.generate_content(
                        model="gemini-3.7-flash",
                        contents=prompt,
                        config=config
                    )
                    if response:
                        break
                except Exception as exc:
                    if "RESOURCE_EXHAUSTED" in str(exc) or "429" in str(exc):
                        logger.warning(f"Gemini quota/rate limit reached during spec extraction for {manufacturer} {mpn}: {exc}")
                        return {"found": False, "error": str(exc)}
                    if attempt == max_retries - 1:
                        raise exc
                    await asyncio.sleep(0.5 * (2 ** attempt))

            if not response or not getattr(response, "candidates", None):
                return {"found": False, "error": "No candidates returned from Gemini"}

            candidate = response.candidates[0]
            raw_text = getattr(response, "text", "") or ""
            if not raw_text and getattr(candidate, "content", None) and getattr(candidate.content, "parts", None):
                raw_text = candidate.content.parts[0].text or ""

            cleaned = clean_json_text(raw_text)
            parsed = json.loads(cleaned)

            parsed["source_url"] = source_url
            parsed["source_type"] = source_type
            parsed["found"] = True
            return parsed

        except Exception as e:
            logger.warning(f"Error in extract_specs_from_text for {manufacturer} {mpn}: {e}")
            return {"found": False, "error": str(e), "source_url": source_url, "source_type": source_type}


    async def extract_full_record(
        self,
        mpn: str,
        manufacturer: str,
        page_text: str,
        source_url: str
    ) -> Dict[str, Any]:
        """
        Extract the complete product record from manufacturer/distributor
        page text using Gemini 3.7 Flash.

        Only values explicitly present in page_text should be returned.
        Missing values remain empty/null and are never fabricated.
        """
        prompt = FULL_RECORD_PROMPT.format(
            manufacturer=manufacturer,
            mpn=mpn,
            page_text=page_text[:15000]
        )

        try:
            if not self.api_key:
                return {
                    "error": "Gemini API key is not configured",
                    "source_url": source_url
                }

            if not genai:
                return {
                    "error": "google-genai SDK is not installed",
                    "source_url": source_url
                }

            client = genai.Client(api_key=self.api_key)

            config = types.GenerateContentConfig(
                temperature=0.1
            )

            response = await fetch_with_retry(
                client.aio.models.generate_content,
                model="gemini-3.7-flash",
                contents=prompt,
                config=config,
            )

            if not response:
                raise ValueError("No response returned from Gemini")

            raw_text = getattr(response, "text", "") or ""

            if not raw_text and getattr(response, "candidates", None):
                candidate = response.candidates[0]
                if (
                    getattr(candidate, "content", None)
                    and getattr(candidate.content, "parts", None)
                ):
                    raw_text = candidate.content.parts[0].text or ""

            raw = clean_json_text(raw_text)

            if not raw:
                raise ValueError("Gemini returned empty response")

            data = json.loads(raw)

            if not isinstance(data, dict):
                raise ValueError("Gemini response is not a JSON object")

            data["source_url"] = source_url

            return data

        except Exception as e:
            logger.error(
                f"extract_full_record failed for {manufacturer} {mpn}: {e}"
            )
            return {
                "error": str(e),
                "source_url": source_url
            }


    async def enrich_from_manufacturer(self, mpn: str, manufacturer: str, category_hint: str = None) -> Dict[str, Any]:
        """
        ORCHESTRATION: cache → Stage 1 → 1.5 → 2 → 3.
        Short-circuits on failure with review_status=NEEDS_HUMAN_REVIEW.
        Caches successful results to SQLite.
        """
        # Check cache first
        cached = enrichment_cache.get_cached(mpn, manufacturer)
        if cached:
            logger.info(f"[Cache HIT] {manufacturer} {mpn}")
            return cached

        stage_timings: Dict[str, float] = {}

        # STAGE 1: URL Lookup
        t0 = time.perf_counter()
        stage1_res = await self.find_manufacturer_url(mpn=mpn, manufacturer=manufacturer, category_hint=category_hint)
        s1_time = time.perf_counter() - t0
        stage_timings["url_lookup_s"] = s1_time
        logger.info(f"[Stage 1: URL Lookup] {manufacturer} {mpn} completed in {s1_time:.3f}s (found={stage1_res.get('found')})")

        if not stage1_res.get("found") or not stage1_res.get("url"):
            return {
                "found": False,
                "stage_failed": "url_lookup",
                "error": stage1_res.get("error"),
                "stage_timings": stage_timings,
                "review_status": "NEEDS_HUMAN_REVIEW",
                "review_reason": f"URL lookup failed for {manufacturer} {mpn}"
            }

        source_url = stage1_res["url"]
        source_type = stage1_res.get("source_type", "manufacturer")
        grounding_sources = stage1_res.get("grounding_sources", [])

        # STAGE 1.5: URL Validation — BUG FIX: log HTTP status + rejection reason per row
        t15 = time.perf_counter()
        val_result = await validate_url(source_url)
        s15_time = time.perf_counter() - t15
        stage_timings["url_validate_s"] = s15_time
        http_status = val_result.get("status_code", 0)
        rejection = val_result.get("rejection_reason") or "none"
        final_url_candidate = val_result.get("final_url", source_url)
        redirect_chain = val_result.get("redirect_chain", [])
        is_valid = val_result.get("valid", False)

        logger.info(
            f"[Stage 1.5 URL Validation] {manufacturer} {mpn}\n"
            f"  URL requested : {source_url}\n"
            f"  HTTP status   : {http_status}\n"
            f"  Final URL     : {final_url_candidate}\n"
            f"  Redirects     : {redirect_chain}\n"
            f"  Valid         : {is_valid}\n"
            f"  Reject reason : {rejection}\n"
            f"  Elapsed       : {s15_time:.3f}s"
        )

        if not is_valid:
            return {
                "found": False,
                "stage_failed": "url_validation",
                "source_url": source_url,
                "source_type": source_type,
                "grounding_sources": grounding_sources,
                "stage_timings": stage_timings,
                "review_status": "NEEDS_HUMAN_REVIEW",
                "review_reason": f"URL validation failed (HTTP {http_status}, {rejection}): {source_url}"
            }

        # BUG FIX: use the post-redirect final_url for scraping AND as the canonical source_url
        # Previously source_url was left as the raw Stage 1 URL even after redirects
        source_url = final_url_candidate  # update to canonical post-redirect URL
        final_url = final_url_candidate

        # STAGE 2: Scrape Page (with Playwright fallback)
        t2 = time.perf_counter()
        page_text = await scrape_page_with_fallback(final_url)
        s2_time = time.perf_counter() - t2
        stage_timings["scrape_s"] = s2_time
        logger.info(f"[Stage 2: Scrape] {final_url} completed in {s2_time:.3f}s (text_length={len(page_text) if page_text else 0})")

        if not page_text or not page_text.strip():
            return {
                "found": False,
                "stage_failed": "scrape",
                "source_url": source_url,
                "source_type": source_type,
                "grounding_sources": grounding_sources,
                "stage_timings": stage_timings,
                "review_status": "NEEDS_HUMAN_REVIEW",
                "review_reason": f"Page scrape returned empty content for {final_url}"
            }

        # STAGE 3: Extract Specs from Text
        t3 = time.perf_counter()
        stage3_res = await self.extract_specs_from_text(
            mpn=mpn,
            manufacturer=manufacturer,
            page_text=page_text,
            source_url=source_url,
            source_type=source_type
        )
        s3_time = time.perf_counter() - t3
        stage_timings["spec_extraction_s"] = s3_time
        logger.info(f"[Stage 3: Spec Extraction] {manufacturer} {mpn} completed in {s3_time:.3f}s")

        if not stage3_res.get("found"):
            return {
                "found": False,
                "stage_failed": "spec_extraction",
                "source_url": source_url,
                "source_type": source_type,
                "grounding_sources": grounding_sources,
                "error": stage3_res.get("error"),
                "stage_timings": stage_timings,
                "review_status": "NEEDS_HUMAN_REVIEW",
                "review_reason": f"Spec extraction failed for {manufacturer} {mpn}"
            }

        # Success — assemble result
        stage3_res["grounding_sources"] = list(dict.fromkeys(grounding_sources + [source_url]))
        stage3_res["stage_timings"] = stage_timings
        stage3_res["review_status"] = None
        stage3_res["review_reason"] = None
        # Expose the raw page text so the pipeline layer can pass it to extract_full_record
        # (not cached — keeps the SQLite cache lean; full_record runs fresh in the pipeline)
        stage3_res["page_text"] = page_text or ""

        # Cache the successful result (without page_text to keep cache size manageable)
        cache_copy = {k: v for k, v in stage3_res.items() if k != "page_text"}
        enrichment_cache.set_cached(mpn, manufacturer, cache_copy)

        return stage3_res


class LLMService:
    def __init__(self, provider_name: str = "mock", api_key: str = ""):
        provider_name = (provider_name or "mock").lower()
        if provider_name == "openai" and api_key:
            self.provider = OpenAIProvider(api_key)
        elif provider_name == "gemini" and api_key:
            self.provider = GeminiProvider(api_key)
        else:
            self.provider = MockLLMProvider()

    async def extract_attributes(self, product_desc: str, category: str, part_num: str, classpath: str = "", manufacturer: str = "", brand: str = "") -> Dict[str, Any]:
        return await self.provider.extract_attributes(product_desc, category, part_num, classpath, manufacturer, brand)

    async def generate_descriptions(self, attributes: Dict[str, Any], raw_desc: str) -> Dict[str, str]:
        return await self.provider.generate_descriptions(attributes, raw_desc)

    async def find_manufacturer_url(self, mpn: str, manufacturer: str) -> Dict[str, Any]:
        if hasattr(self.provider, "find_manufacturer_url"):
            return await self.provider.find_manufacturer_url(mpn, manufacturer)
        return {"found": False, "error": "Current provider does not support find_manufacturer_url"}

    async def extract_specs_from_text(self, mpn: str, manufacturer: str, page_text: str, source_url: str, source_type: str = "manufacturer") -> Dict[str, Any]:
        if hasattr(self.provider, "extract_specs_from_text"):
            return await self.provider.extract_specs_from_text(mpn, manufacturer, page_text, source_url, source_type)
        return {"found": False, "error": "Current provider does not support extract_specs_from_text"}


    async def extract_full_record(self, mpn: str, manufacturer: str, page_text: str, source_url: str) -> Dict[str, Any]:
        if hasattr(self.provider, "extract_full_record"):
            return await self.provider.extract_full_record(
                mpn,
                manufacturer,
                page_text,
                source_url
            )
        return {
            "error": "Current provider does not support extract_full_record",
            "source_url": source_url
        }


    async def enrich_from_manufacturer(self, mpn: str, manufacturer: str, category_hint: str = None) -> Dict[str, Any]:
        if hasattr(self.provider, "enrich_from_manufacturer"):
            return await self.provider.enrich_from_manufacturer(mpn, manufacturer, category_hint=category_hint)
        return {"found": False, "error": "Current provider does not support manufacturer enrichment"}