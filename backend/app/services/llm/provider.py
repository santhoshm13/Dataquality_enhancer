import json
import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

logger = logging.getLogger("app.services.llm")

class BaseLLMProvider(ABC):
    @abstractmethod
    async def extract_attributes(self, product_desc: str, category: str, part_num: str) -> Dict[str, Any]:
        pass

    @abstractmethod
    async def generate_descriptions(self, attributes: Dict[str, Any], raw_desc: str) -> Dict[str, str]:
        pass


class MockLLMProvider(BaseLLMProvider):
    """
    Mock LLM provider for deterministic offline testing and demonstration.
    """
    async def extract_attributes(self, product_desc: str, category: str, part_num: str) -> Dict[str, Any]:
        desc_lower = product_desc.lower()
        attributes = []
        
        # Rule-based mock extraction based on raw description cues
        if "dishwasher" in desc_lower or "pdsh" in desc_lower or "wdts" in desc_lower:
            attributes = [
                {"name": "Series", "value": "Professional Series", "uom": None, "confidence": 0.95},
                {"name": "Number of Wash Cycles", "value": "5", "uom": None, "confidence": 0.98},
                {"name": "Voltage Rating", "value": "120", "uom": "V", "confidence": 0.99},
                {"name": "Amperage Rating", "value": "15", "uom": "A", "confidence": 0.97},
                {"name": "Mounting Type", "value": "Leg", "uom": None, "confidence": 0.94},
                {"name": "Sound Level", "value": "47", "uom": "dBA", "confidence": 0.96},
                {"name": "Finish", "value": "Stainless Steel", "uom": None, "confidence": 0.99}
            ]
        elif "sanding belt" in desc_lower or "abrasive" in desc_lower or "p80" in desc_lower or "p150" in desc_lower:
            grit = "P80"
            for g in ["P80", "P120", "P150", "P180", "P220", "P320"]:
                if g.lower() in desc_lower:
                    grit = g
                    break
            attributes = [
                {"name": "Grit", "value": grit, "uom": None, "confidence": 0.98},
                {"name": "Abrasive Material", "value": "Aluminum Oxide", "uom": None, "confidence": 0.92},
                {"name": "Backing Weight", "value": "X-Weight", "uom": None, "confidence": 0.90},
                {"name": "Pack Quantity", "value": "6", "uom": "pc", "confidence": 0.96}
            ]
        else:
            attributes = [
                {"name": "Color", "value": "Standard", "uom": None, "confidence": 0.80},
                {"name": "Material", "value": "Steel", "uom": None, "confidence": 0.85}
            ]
            
        return {
            "department": "Appliances" if "dishwasher" in desc_lower else "Abrasives",
            "class": "Large Appliances" if "dishwasher" in desc_lower else "Coated Abrasives",
            "category": "Built-In Dishwashers" if "dishwasher" in desc_lower else "Sanding Belts",
            "attributes": attributes
        }

    async def generate_descriptions(self, attributes: Dict[str, Any], raw_desc: str) -> Dict[str, str]:
        part_num = attributes.get("mfg_part_num", "PRODUCT")
        brand = attributes.get("brand", "Generic")
        category = attributes.get("category", "Item")
        
        return {
            "MOBILE_DESC": f"{brand} {category} {part_num}",
            "INVOICE_DESC": f"{category.upper()} {part_num} {brand.upper()}",
            "SHORT_DESC": f"{brand} {category} ({part_num}) with standard industrial features",
            "LONG_DESC1": f"High performance {brand} {category} (Model {part_num}). Formulated with heavy duty materials for optimum efficiency and long service life.",
            "RETAIL_DESC": f"Premium {brand} {category} designed for professional performance.",
            "MARKETING_DESCRIPTION": f"Upgrade your operations with the trusted quality of {brand} {category}."
        }


class OpenAIProvider(BaseLLMProvider):
    def __init__(self, api_key: str):
        self.api_key = api_key

    async def extract_attributes(self, product_desc: str, category: str, part_num: str) -> Dict[str, Any]:
        # Placeholder for OpenAI API call integration
        return await MockLLMProvider().extract_attributes(product_desc, category, part_num)

    async def generate_descriptions(self, attributes: Dict[str, Any], raw_desc: str) -> Dict[str, str]:
        return await MockLLMProvider().generate_descriptions(attributes, raw_desc)


class GeminiProvider(BaseLLMProvider):
    def __init__(self, api_key: str):
        self.api_key = api_key

    async def extract_attributes(self, product_desc: str, category: str, part_num: str) -> Dict[str, Any]:
        # Placeholder for Gemini API call integration
        return await MockLLMProvider().extract_attributes(product_desc, category, part_num)

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

    async def extract_attributes(self, product_desc: str, category: str, part_num: str) -> Dict[str, Any]:
        return await self.provider.extract_attributes(product_desc, category, part_num)

    async def generate_descriptions(self, attributes: Dict[str, Any], raw_desc: str) -> Dict[str, str]:
        return await self.provider.generate_descriptions(attributes, raw_desc)
