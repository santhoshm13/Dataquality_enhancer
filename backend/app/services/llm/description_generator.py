import logging
from typing import Dict, Any, List
import asyncio
from app.services.llm.provider import LLMService

logger = logging.getLogger("app.services.descriptions")

# Strict Unilog Guidelines based on audit notes
UNILOG_GUIDELINES_PROMPT = """
Follow UNILOG_INTERNAL_CONTENT_GUIDELINES strictly:
1. INVOICE_DESC: Maximum 40 characters. Format: [Noun] [Modifier] [Part Num]
2. MOBILE_DESC: 60-80 characters. Format: [Brand] [Noun] [Modifier] [Part Num]
3. SHORT_DESC: Maximum 80 characters. Format: [Brand] [Noun] [Attributes...]
4. LONG_DESC1: Maximum 1000 characters. Bulleted list of all attributes.
5. RETAIL_DESC: Maximum 255 characters. Sentence format.
6. MARKETING_DESCRIPTION: Maximum 500 characters. Persuasive copy.

Do NOT hallucinate facts. Use ONLY provided validated attributes.
"""

CHARACTER_LIMITS = {
    "INVOICE_DESC": 40,
    "MOBILE_DESC": 80,
    "SHORT_DESC": 80,
    "LONG_DESC1": 1000,
    "RETAIL_DESC": 255,
    "MARKETING_DESCRIPTION": 500
}

class DescriptionGeneratorService:
    def __init__(self):
        self.llm_service = LLMService(provider_name="mock")

    async def generate_fact_grounded_descriptions(
        self,
        mfg_part_num: str,
        brand: str,
        manufacturer: str,
        category: str,
        validated_attributes: List[Dict[str, Any]],
        raw_description: str = ""
    ) -> Dict[str, str]:
        """
        Uses LLM to generate descriptions adhering to UNILOG_INTERNAL_CONTENT_GUIDELINES.
        """
        # Pack into context for LLM
        context = {
            "mfg_part_num": mfg_part_num,
            "brand": brand,
            "manufacturer": manufacturer,
            "category": category,
            "validated_attributes": validated_attributes,
            "guidelines": UNILOG_GUIDELINES_PROMPT
        }
        
        # Call LLM Service
        descriptions = await self.llm_service.generate_descriptions(context, raw_description)
        
        # Auto-correction / fallback truncation to enforce limits strictly
        corrected = {}
        for key, limit in CHARACTER_LIMITS.items():
            val = descriptions.get(key, "")
            if len(val) > limit:
                # simple truncate for safety
                corrected[key] = val[:limit].strip()
            else:
                corrected[key] = val
                
        return corrected

description_generator = DescriptionGeneratorService()
