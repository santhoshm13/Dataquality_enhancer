import json
import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List

from app.services.lov.lov_retrieval_service import get_lov_for_classpath

logger = logging.getLogger("app.services.llm")

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
        attributes = []
        
        # 1. Fetch LOV for classpath
        lov_entries = get_lov_for_classpath(classpath)
        permitted_attrs = {e.attribute_label.lower(): e for e in lov_entries}
        
        # Rule-based mock extraction based on raw description cues
        raw_extracted = []
        if "dishwasher" in desc_lower or "pdsh" in desc_lower or "wdts" in desc_lower:
            raw_extracted = [
                {"name": "Series", "value": "Professional Series", "uom": None, "confidence": 0.95},
                {"name": "Number of Wash Cycles", "value": "5", "uom": None, "confidence": 0.98},
                {"name": "Voltage Rating", "value": "120", "uom": "V", "confidence": 0.99},
                {"name": "Amperage Rating", "value": "15", "uom": "A", "confidence": 0.97},
                {"name": "Mounting Type", "value": "Leg", "uom": None, "confidence": 0.94},
                {"name": "Sound Level", "value": "47", "uom": "dBA", "confidence": 0.96},
                {"name": "Finish", "value": "Stainless Steel", "uom": None, "confidence": 0.99},
                {"name": "Hallucinated Field", "value": "Fake", "uom": None, "confidence": 0.99} # Should be filtered out
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
            
        # 2. Filter LLM extracted attributes strictly against LOV list (Post-processing)
        for attr in raw_extracted:
            name_lower = attr["name"].lower()
            if name_lower in permitted_attrs:
                # Add it, it's permitted
                attributes.append(attr)
            else:
                logger.debug(f"Filtered out hallucinated attribute: {attr['name']}")

        return {
            "department": "Appliances" if "dishwasher" in desc_lower else "Abrasives",
            "class": "Large Appliances" if "dishwasher" in desc_lower else "Coated Abrasives",
            "category": "Built-In Dishwashers" if "dishwasher" in desc_lower else "Sanding Belts",
            "attributes": attributes
        }

    async def generate_descriptions(self, attributes: Dict[str, Any], raw_desc: str) -> Dict[str, str]:
        # attributes here actually receives 'context' from DescriptionGeneratorService
        part_num = attributes.get("mfg_part_num", "PRODUCT")
        brand = attributes.get("brand", "Generic")
        category = attributes.get("category", "Item")
        validated = attributes.get("validated_attributes", [])
        
        attr_summary = ", ".join([f"{a.get('name')}: {a.get('value')} {a.get('uom', '')}".strip() for a in validated])
        
        # 1. INVOICE_DESC: Max 40 chars
        invoice = f"{category} {part_num}"[:40]
        
        # 2. MOBILE_DESC: 60-80 chars
        mobile = f"{brand} {category} {part_num}"
        if len(mobile) < 60:
            mobile = f"{brand} {category} {part_num} high quality"
        mobile = mobile[:80]
        
        # 3. SHORT_DESC: Max 80 chars
        short_desc = f"{brand} {category} {attr_summary}"[:80]
        
        # 4. LONG_DESC1: Max 1000 chars
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

    async def extract_attributes(self, product_desc: str, category: str, part_num: str, classpath: str = "", manufacturer: str = "", brand: str = "") -> Dict[str, Any]:
        # Placeholder for OpenAI API call integration
        return await MockLLMProvider().extract_attributes(product_desc, category, part_num, classpath, manufacturer, brand)

    async def generate_descriptions(self, attributes: Dict[str, Any], raw_desc: str) -> Dict[str, str]:
        return await MockLLMProvider().generate_descriptions(attributes, raw_desc)


class GeminiProvider(BaseLLMProvider):
    def __init__(self, api_key: str):
        self.api_key = api_key

    async def extract_attributes(self, product_desc: str, category: str, part_num: str, classpath: str = "", manufacturer: str = "", brand: str = "") -> Dict[str, Any]:
        # Placeholder for Gemini API call integration
        return await MockLLMProvider().extract_attributes(product_desc, category, part_num, classpath, manufacturer, brand)

    async def generate_descriptions(self, attributes: Dict[str, Any], raw_desc: str) -> Dict[str, str]:
        return await MockLLMProvider().generate_descriptions(attributes, raw_desc)


class LLMService:
    def __init__(self, provider_name: str = "mock", api_key: str = ""):
        provider_name = provider_name.lower()
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
