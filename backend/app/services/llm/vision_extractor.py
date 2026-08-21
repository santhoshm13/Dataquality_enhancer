"""
Vision-Assisted Attribute Extraction (Stage 3.5)

Calls a vision-capable LLM (Gemini 1.5 Flash) to extract visual attributes
from a product image URL. Cross-validates against text-derived attributes.

Graceful skip: if no image URL, or LLM/network fails, returns empty dict with
skip_reason - never raises, never blocks the pipeline.
"""
import logging
import json
import re
from typing import Dict, Any, Optional, List

logger = logging.getLogger("app.services.vision_extractor")

VISUAL_ATTRIBUTE_SCHEMA = {
    "color": "Primary color(s) of the product",
    "finish": "Surface finish (e.g., brushed, matte, glossy, textured)",
    "shape": "Physical shape (e.g., rectangular, round, T-shaped)",
    "material": "Visible material (e.g., composite, aluminum, PVC, wood)",
    "style": "Design style (e.g., contemporary, traditional, rustic)"
}


async def extract_visual_attributes(
    image_url: Optional[str],
    category: str = "",
    classpath: str = "",
    llm_service=None
) -> Dict[str, Any]:
    """
    Stage 3.5: Vision-assisted attribute extraction.

    Args:
        image_url:   URL of the product image (skips gracefully if None/empty)
        category:    Fine category hint for the LLM prompt
        classpath:   Full taxonomy path for context
        llm_service: LLMService instance (Gemini preferred for vision)

    Returns dict with:
        visual_attributes: list of {name, value, confidence, source: "vision_llm"}
        skipped: True if stage was skipped
        skip_reason: explanation if skipped
    """
    if not image_url or not image_url.strip():
        return {"visual_attributes": [], "skipped": True, "skip_reason": "no_image_url"}

    if llm_service is None:
        return {"visual_attributes": [], "skipped": True, "skip_reason": "no_llm_service"}

    # Check if the LLM service supports vision (Gemini does, mock/openai may not)
    if not hasattr(llm_service, "_provider") or not hasattr(llm_service._provider, "client"):
        return {"visual_attributes": [], "skipped": True, "skip_reason": "provider_no_vision_support"}

    try:
        prompt = f"""You are a product data specialist. Analyze the product image and extract visual attributes.

Category: {category or "Unknown"}
Taxonomy path: {classpath or "Unknown"}

Extract ONLY what is clearly visible in the image. Return a JSON object:
{{
  "color": "primary color(s) visible",
  "finish": "surface finish",
  "shape": "physical shape",
  "material": "visible material type",
  "style": "design style"
}}

Rules:
- Use "unknown" for anything not clearly visible
- Be specific (e.g., "dark brown composite" not just "brown")
- Confidence: 0.0–1.0 based on image clarity
- Also return a "confidence" field (0.0–1.0) for overall extraction confidence

Return ONLY the JSON object, no markdown.
"""
        # Attempt Gemini vision call with image URL
        import httpx
        async with httpx.AsyncClient(timeout=15.0) as client:
            img_resp = await client.get(image_url)
            if img_resp.status_code != 200:
                return {"visual_attributes": [], "skipped": True, "skip_reason": f"image_fetch_failed_{img_resp.status_code}"}
            image_bytes = img_resp.content
            content_type = img_resp.headers.get("content-type", "image/jpeg")

        # Use Gemini vision API
        try:
            from google import genai
            from google.genai import types as genai_types
            client_gemini = llm_service._provider.client
            response = await client_gemini.aio.models.generate_content(
                model="gemini-1.5-flash",
                contents=[
                    genai_types.Part.from_bytes(data=image_bytes, mime_type=content_type),
                    prompt
                ]
            )
            raw_text = response.text.strip()
        except Exception as vision_e:
            logger.warning(f"Gemini vision call failed: {vision_e}")
            return {"visual_attributes": [], "skipped": True, "skip_reason": f"vision_llm_error: {str(vision_e)[:80]}"}

        # Parse JSON response
        if raw_text.startswith("```"):
            raw_text = re.sub(r"```[a-z]*\n?", "", raw_text).strip("` \n")
        result = json.loads(raw_text)
        overall_confidence = float(result.pop("confidence", 0.7))

        visual_attrs = []
        for attr_name, value in result.items():
            if value and value.lower() != "unknown" and attr_name in VISUAL_ATTRIBUTE_SCHEMA:
                visual_attrs.append({
                    "name": attr_name,
                    "value": str(value),
                    "confidence": overall_confidence,
                    "source": "vision_llm",
                    "method": "gemini_vision",
                    "validation_status": "VISION",
                    "rationale": f"Extracted from product image via vision LLM. Confidence: {round(overall_confidence*100)}%."
                })

        logger.info(f"Vision extraction: {len(visual_attrs)} attributes from {image_url[:60]}")
        return {
            "visual_attributes": visual_attrs,
            "skipped": False,
            "skip_reason": None,
            "image_url": image_url
        }

    except Exception as e:
        logger.warning(f"Vision extraction failed gracefully for {image_url}: {e}")
        return {"visual_attributes": [], "skipped": True, "skip_reason": f"exception: {str(e)[:80]}"}


def cross_validate_visual_vs_text(
    visual_attrs: List[Dict[str, Any]],
    text_attrs: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Cross-validates vision-derived attributes against text-derived attributes.

    Rules:
    - Agreement (same attr name, values match normalized): boost text confidence +0.05
    - Conflict (same attr name, values differ): add vision_conflict=True to both,
      attach vision_value and text_value, route to NEEDS_REVIEW
    - Vision-only attrs: append with source=vision_llm (no conflict)

    Returns merged attribute list.
    """
    text_by_name = {a.get("name", "").lower(): a for a in text_attrs}
    merged = list(text_attrs)
    processed_vision_names = set()

    for va in visual_attrs:
        vname = va.get("name", "").lower()
        vval = str(va.get("value", "")).lower().strip()
        processed_vision_names.add(vname)

        if vname in text_by_name:
            ta = text_by_name[vname]
            tval = str(ta.get("value", "")).lower().strip()

            if vval == tval or vval in tval or tval in vval:
                # Agreement - boost confidence
                ta["confidence"] = min(1.0, float(ta.get("confidence", 0.8)) + 0.05)
                ta["vision_confirmed"] = True
                ta["vision_value"] = va.get("value")
                ta["rationale"] = (ta.get("rationale", "") +
                    f" Vision LLM confirmed: '{va.get('value')}' - confidence boosted.")
            else:
                # Conflict - flag both
                ta["vision_conflict"] = True
                ta["vision_value"] = va.get("value")
                ta["text_value"] = ta.get("value")
                ta["validation_status"] = "NEEDS_REVIEW"
                ta["rationale"] = (
                    f"VISION CONFLICT: text extraction gave '{ta.get('value')}' but "
                    f"image analysis gave '{va.get('value')}'. Human review required."
                )
        else:
            # Vision-only attribute - append
            merged.append(va)

    return merged
