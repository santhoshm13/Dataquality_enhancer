import asyncio
import json
import logging
import re
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
    """Apply UNILOG length constraints and minimum padding."""
    expected_keys = ["MOBILE_DESC", "INVOICE_DESC", "SHORT_DESC", "LONG_DESC1", "RETAIL_DESC", "MARKETING_DESCRIPTION"]
    corrected = {}

    for key in expected_keys:
        val = str(descriptions.get(key, "")).strip()
        limit = UNILOG_LIMITS.get(key, 1000)
        if len(val) > limit:
            corrected[key] = val[:limit].strip()
        else:
            corrected[key] = val

    # Enforce minimum 60 chars for MOBILE_DESC
    mobile = corrected.get("MOBILE_DESC", "")
    if len(mobile) < 60:
        base = f"{context.get('brand', '')} {context.get('category', '')} {context.get('mfg_part_num', '')}".strip()
        padded = base if base else mobile
        while len(padded) < 60:
            padded += " high quality"
        corrected["MOBILE_DESC"] = padded[:80].strip()

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
    Mock LLM provider for deterministic offline testing and demonstration.
    """
    async def extract_attributes(self, product_desc: str, category: str, part_num: str, classpath: str = "", manufacturer: str = "", brand: str = "") -> Dict[str, Any]:
        desc_lower = product_desc.lower()
        lov_entries = get_lov_for_classpath(classpath)
        permitted_attrs = {e.attribute_label.lower(): e for e in lov_entries}

        if "dishwasher" in desc_lower or "pdsh" in desc_lower or "wdts" in desc_lower:
            raw_extracted = [
                {"name": "Series", "value": "Professional Series", "uom": None, "confidence": 0.95},
                {"name": "Number of Wash Cycles", "value": "5", "uom": None, "confidence": 0.98},
                {"name": "Voltage Rating", "value": "120", "uom": "V", "confidence": 0.99},
                {"name": "Amperage Rating", "value": "15", "uom": "A", "confidence": 0.97},
                {"name": "Mounting Type", "value": "Leg", "uom": None, "confidence": 0.94},
                {"name": "Sound Level", "value": "47", "uom": "dBA", "confidence": 0.96},
                {"name": "Finish", "value": "Stainless Steel", "uom": None, "confidence": 0.99},
                {"name": "Hallucinated Field", "value": "Fake", "uom": None, "confidence": 0.99}
            ]
        elif "sanding belt" in desc_lower or "abrasive" in desc_lower or "p80" in desc_lower or "p150" in desc_lower:
            grit = "P80"
            for g in ["P80", "P120", "P150", "P180", "P220", "P320"]:
                if g.lower() in desc_lower:
                    grit = g
                    break
            raw_extracted = [
                {"name": "Grit", "value": grit, "uom": None, "confidence": 0.98},
                {"name": "Abrasive Material", "value": "Aluminum Oxide", "uom": None, "confidence": 0.92},
                {"name": "Backing Weight", "value": "X-Weight", "uom": None, "confidence": 0.90},
                {"name": "Pack Quantity", "value": "6", "uom": "pc", "confidence": 0.96}
            ]
        else:
            raw_extracted = [
                {"name": "Color", "value": "Standard", "uom": None, "confidence": 0.80},
                {"name": "Material", "value": "Steel", "uom": None, "confidence": 0.85},
                {"name": "Finish", "value": "Chrome", "uom": None, "confidence": 0.90}
            ]

        validated = validate_attributes_against_lov(raw_extracted, lov_entries)

        return {
            "department": "Appliances" if "dishwasher" in desc_lower else "Abrasives",
            "class": "Large Appliances" if "dishwasher" in desc_lower else "Coated Abrasives",
            "category": "Built-In Dishwashers" if "dishwasher" in desc_lower else "Sanding Belts",
            "attributes": validated
        }

    async def generate_descriptions(self, attributes: Dict[str, Any], raw_desc: str) -> Dict[str, str]:
        part_num = attributes.get("mfg_part_num", "PRODUCT")
        brand = attributes.get("brand", "Generic")
        category = attributes.get("category", "Item")
        validated = attributes.get("validated_attributes", [])

        attr_summary = ", ".join([f"{a.get('name')}: {a.get('value')} {a.get('uom', '')}".strip() for a in validated])

        invoice = f"{category} {part_num}"[:40]

        mobile = f"{brand} {category} {part_num}"
        if len(mobile) < 60:
            mobile = f"{brand} {category} {part_num} high quality"
        mobile = mobile[:80]

        short_desc = f"{brand} {category} {attr_summary}"[:80]
        long_desc = f"{brand} {category}. Part: {part_num}. Specs: {attr_summary}."[:1000]

        return {
            "MOBILE_DESC": mobile,
            "INVOICE_DESC": invoice,
            "SHORT_DESC": short_desc,
            "LONG_DESC1": long_desc,
            "RETAIL_DESC": f"Premium {brand} {category} designed for professional performance."[:255],
            "MARKETING_DESCRIPTION": f"Upgrade your operations with the trusted quality of {brand} {category}."[:500]
        }


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

    async def enrich_from_manufacturer(self, mpn: str, manufacturer: str) -> Dict[str, Any]:
        """
        Enrich industrial product record by finding the product on the manufacturer's official website
        using gemini-3.7-flash with google_search and url_context tools.
        """
        prompt = (
            f"Manufacturer: {manufacturer}\n"
            f"Manufacturer Part Number (MPN): {mpn}\n\n"
            f"Find this exact product on the manufacturer's official website (not\n"
            f"distributors, not marketplaces like Amazon/eBay). Extract:\n"
            f"- Full official product name/title\n"
            f"- Product category/series as described by the manufacturer\n"
            f"- Every technical specification listed (name + value + unit as written)\n"
            f"- Any listed features, description text, and image URLs\n"
            f"- The exact source URL you found this on\n\n"
            f"If the manufacturer's own site has no page for this MPN, search reputable\n"
            f"distributor sites as fallback only, and clearly mark the source as \n"
            f"'fallback'. If nothing is found, return found=false — do not invent data.\n\n"
            f"Return strict JSON:\n"
            f"{{found, source_url, source_type, product_title, raw_specs, raw_description, image_urls}}"
        )

        try:
            if not self.api_key:
                return {"found": False, "error": "Gemini API key is not configured"}

            if not genai:
                return {"found": False, "error": "google-genai SDK is not installed"}

            client = genai.Client(api_key=self.api_key)
            tools = [
                types.Tool(google_search=types.GoogleSearch()),
                types.Tool(url_context=types.UrlContext()),
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
                        logger.warning(f"Gemini quota/rate limit reached during enrichment for {manufacturer} {mpn}: {exc}")
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

            # Attach provenance list
            parsed["grounding_sources"] = list(dict.fromkeys(grounding_sources))
            return parsed

        except Exception as e:
            logger.warning(f"Error in enrich_from_manufacturer for {manufacturer} {mpn}: {e}")
            return {"found": False, "error": str(e)}


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

    async def enrich_from_manufacturer(self, mpn: str, manufacturer: str) -> Dict[str, Any]:
        if hasattr(self.provider, "enrich_from_manufacturer"):
            return await self.provider.enrich_from_manufacturer(mpn, manufacturer)
        return {"found": False, "error": "Current provider does not support manufacturer enrichment"}