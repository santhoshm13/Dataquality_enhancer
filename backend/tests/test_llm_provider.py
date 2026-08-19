import pytest
import asyncio
import json
from unittest.mock import AsyncMock, MagicMock, patch
import httpx

from app.services.llm.provider import (
    LLMService,
    MockLLMProvider,
    OpenAIProvider,
    GeminiProvider,
    validate_attributes_against_lov,
    enforce_description_limits
)
from app.services.llm.retry_wrapper import fetch_with_retry
from app.services.llm.prompt_builder import build_extraction_prompt, build_description_prompt
from app.schemas.lov import LovEntry
from app.services.lov.lov_retrieval_service import lov_retrieval_service

@pytest.fixture
def mock_lov_cache():
    """Setup mock LOV cache for a known classpath."""
    lov_retrieval_service.clear_cache()
    cp = "Abrasives > Coated Abrasives > Sanding Belts"
    entries = [
        LovEntry(
            attribute_label="Grit",
            attribute_values="P80, P120, P150, P220",
            normalized_label="grit",
            normalized_values="p80, p120, p150, p220",
            filtering="Y",
            guidelines="Grit rating",
            uom_standard=None,
            classpath=cp
        ),
        LovEntry(
            attribute_label="Abrasive Material",
            attribute_values="Aluminum Oxide, Ceramic, Zirconia",
            normalized_label="abrasive material",
            normalized_values="aluminum oxide, ceramic, zirconia",
            filtering="Y",
            guidelines="Grain material",
            uom_standard=None,
            classpath=cp
        ),
        LovEntry(
            attribute_label="Backing Weight",
            attribute_values="X-Weight, Y-Weight, J-Weight",
            normalized_label="backing weight",
            normalized_values="x-weight, y-weight, j-weight",
            filtering="Y",
            guidelines="",
            uom_standard=None,
            classpath=cp
        ),
        LovEntry(
            attribute_label="Belt Width",
            attribute_values=None,
            normalized_label="belt width",
            normalized_values=None,
            filtering="Y",
            guidelines="",
            uom_standard="in",
            classpath=cp
        )
    ]
    lov_retrieval_service._cache[cp] = entries
    return cp


# ==============================================================================
# 1. Prompt Construction Unit Tests (Independent of Provider)
# ==============================================================================

def test_prompt_builder_extraction_contains_lov_attributes_only():
    """
    Requirement 7: Assert build_extraction_prompt() contains the LOV-permitted
    attribute values passed in, and does NOT contain attributes from unrelated classpaths.
    """
    abrasives_cp = "Abrasives > Coated Abrasives > Sanding Belts"
    abrasives_entries = [
        LovEntry(
            attribute_label="Grit",
            attribute_values="P80, P120",
            normalized_label="grit",
            normalized_values="p80, p120",
            filtering="Y",
            guidelines="",
            uom_standard=None,
            classpath=abrasives_cp
        ),
        LovEntry(
            attribute_label="Abrasive Material",
            attribute_values="Aluminum Oxide",
            normalized_label="abrasive material",
            normalized_values="aluminum oxide",
            filtering="Y",
            guidelines="",
            uom_standard=None,
            classpath=abrasives_cp
        )
    ]

    prompt = build_extraction_prompt(
        product_desc="High performance sanding belt 1/2x18 P80",
        category="Sanding Belts",
        part_num="DCB518ASTS06G",
        classpath=abrasives_cp,
        manufacturer="Freud Inc",
        brand="Diablo",
        lov_entries=abrasives_entries
    )

    # Asserts that LOV-permitted attributes and values passed in are present in the prompt
    assert "Grit" in prompt
    assert "P80, P120" in prompt
    assert "Abrasive Material" in prompt
    assert "Aluminum Oxide" in prompt
    assert abrasives_cp in prompt
    assert "Diablo" in prompt

    # Asserts that attributes from unrelated classpaths (e.g. Faucets, Dishwashers) are NOT in the prompt
    assert "Spout Height" not in prompt
    assert "Number of Wash Cycles" not in prompt
    assert "Flow Rate" not in prompt
    assert "WaterSense Certified" not in prompt


def test_prompt_builder_description_keys():
    """Test that build_description_prompt includes all required UNILOG keys."""
    context = {
        "mfg_part_num": "PART-99",
        "brand": "Moen",
        "category": "Kitchen Faucets",
        "validated_attributes": [{"name": "Finish", "value": "Chrome", "uom": None}]
    }
    prompt = build_description_prompt(context)
    for key in ["MOBILE_DESC", "INVOICE_DESC", "SHORT_DESC", "LONG_DESC1", "RETAIL_DESC", "MARKETING_DESCRIPTION"]:
        assert key in prompt


# ==============================================================================
# 2. OpenAIProvider Unit Tests
# ==============================================================================

def test_openai_extract_attributes_success(mock_lov_cache):
    """
    Requirement 1 (Success path): Mock a valid OpenAI JSON response containing attributes
    present in the LOV list. Assert parsed output matches expected structured attributes.
    """
    valid_openai_response = {
        "choices": [{
            "message": {
                "content": json.dumps({
                    "department": "Abrasives",
                    "class": "Coated Abrasives",
                    "category": "Sanding Belts",
                    "attributes": [
                        {"name": "Grit", "value": "P80", "uom": None, "confidence": 0.95},
                        {"name": "Abrasive Material", "value": "Aluminum Oxide", "uom": None, "confidence": 0.92},
                        {"name": "Backing Weight", "value": "X-Weight", "uom": None, "confidence": 0.90}
                    ]
                })
            }
        }]
    }

    async def run():
        with patch("app.services.llm.provider.fetch_with_retry", new_callable=AsyncMock) as mock_fetch:
            mock_fetch.return_value = valid_openai_response

            provider = OpenAIProvider(api_key="sk-test-key")
            result = await provider.extract_attributes(
                product_desc="High performance sanding belt P80 Aluminum Oxide",
                category="Sanding Belts",
                part_num="123",
                classpath=mock_lov_cache
            )

            assert result["department"] == "Abrasives"
            assert result["class"] == "Coated Abrasives"
            assert result["category"] == "Sanding Belts"
            assert len(result["attributes"]) == 3

            attr_dict = {a["name"]: a["value"] for a in result["attributes"]}
            assert attr_dict["Grit"] == "P80"
            assert attr_dict["Abrasive Material"] == "Aluminum Oxide"
            assert attr_dict["Backing Weight"] == "X-Weight"

    asyncio.run(run())


def test_openai_lov_validation_rejection(mock_lov_cache):
    """
    Requirement 2 (LOV rejection): Mock response where LLM returns an attribute value NOT in
    permitted LOV list and a hallucinated attribute. Assert they are filtered out.
    """
    openai_response_with_invalid_values = {
        "choices": [{
            "message": {
                "content": json.dumps({
                    "department": "Abrasives",
                    "class": "Coated Abrasives",
                    "category": "Sanding Belts",
                    "attributes": [
                        # Permitted: Grit P80 is in LOV (P80, P120, P150, P220)
                        {"name": "Grit", "value": "P80", "uom": None, "confidence": 0.95},
                        # Rejected: "Unicorn Diamond" is NOT in LOV permitted values (Aluminum Oxide, Ceramic, Zirconia)
                        {"name": "Abrasive Material", "value": "Unicorn Diamond", "uom": None, "confidence": 0.90},
                        # Rejected: "Hallucinated Attribute" is NOT in LOV attribute labels
                        {"name": "Hallucinated Attribute", "value": "Fake Value", "uom": None, "confidence": 0.88}
                    ]
                })
            }
        }]
    }

    async def run():
        with patch("app.services.llm.provider.fetch_with_retry", new_callable=AsyncMock) as mock_fetch:
            mock_fetch.return_value = openai_response_with_invalid_values

            provider = OpenAIProvider(api_key="sk-test-key")
            result = await provider.extract_attributes(
                product_desc="High performance sanding belt P80 Unicorn Diamond",
                category="Sanding Belts",
                part_num="123",
                classpath=mock_lov_cache
            )

            attr_names = [a["name"] for a in result["attributes"]]
            # Valid attribute passes
            assert "Grit" in attr_names
            # Invalid value filtered out
            assert "Abrasive Material" not in attr_names
            # Hallucinated attribute label filtered out
            assert "Hallucinated Attribute" not in attr_names
            assert len(result["attributes"]) == 1

    asyncio.run(run())


def test_openai_malformed_non_json_response_fallback(mock_lov_cache):
    """
    Requirement 3 (Malformed response): Mock response that isn't valid JSON.
    Assert provider catches this and falls back to MockLLMProvider without unhandled exception.
    """
    malformed_response = {
        "choices": [{
            "message": {
                "content": "Sorry, as an AI model I cannot generate JSON today: {invalid json content...<>"
            }
        }]
    }

    async def run():
        with patch("app.services.llm.provider.fetch_with_retry", new_callable=AsyncMock) as mock_fetch:
            mock_fetch.return_value = malformed_response

            provider = OpenAIProvider(api_key="sk-test-key")
            result = await provider.extract_attributes(
                product_desc="High performance sanding belt P80",
                category="Sanding Belts",
                part_num="123",
                classpath=mock_lov_cache
            )

            # Fallback to MockLLMProvider should succeed without crashing
            assert isinstance(result, dict)
            assert "attributes" in result
            assert "department" in result

    asyncio.run(run())


def test_openai_retry_exhaustion_fallback(mock_lov_cache):
    """
    Requirement 5 (Retry exhaustion): Mock all retry attempts failing (fetch_with_retry returning None).
    Assert provider falls back to MockLLMProvider gracefully.
    """
    async def run():
        with patch("app.services.llm.provider.fetch_with_retry", new_callable=AsyncMock) as mock_fetch:
            # Simulate fetch_with_retry exhausted all retries and returned None
            mock_fetch.return_value = None

            provider = OpenAIProvider(api_key="sk-test-key")
            result = await provider.extract_attributes(
                product_desc="High performance sanding belt P80",
                category="Sanding Belts",
                part_num="123",
                classpath=mock_lov_cache
            )

            assert isinstance(result, dict)
            assert "attributes" in result
            attr_names = [a["name"] for a in result["attributes"]]
            assert "Grit" in attr_names

    asyncio.run(run())


def test_openai_description_length_compliance():
    """
    Requirement 6 (Description length compliance): Mock response where a generated description
    exceeds UNILOG limit (e.g. INVOICE_DESC > 40 chars). Assert provider trims/corrects it.
    """
    oversized_descriptions = {
        "choices": [{
            "message": {
                "content": json.dumps({
                    "INVOICE_DESC": "This is an extremely long invoice description that exceeds the forty character limit by a lot", # > 40
                    "MOBILE_DESC": "Diablo Sanding Belt DCB518ASTS06G", # < 60 chars -> needs minimum padding
                    "SHORT_DESC": "Diablo Sanding Belt 1/2x18 P80 Aluminum Oxide Professional High Performance Industrial Grade Extra Long Short Description", # > 80
                    "LONG_DESC1": "Detailed long description",
                    "RETAIL_DESC": "Retail sentence description",
                    "MARKETING_DESCRIPTION": "Marketing description"
                })
            }
        }]
    }

    async def run():
        with patch("app.services.llm.provider.fetch_with_retry", new_callable=AsyncMock) as mock_fetch:
            mock_fetch.return_value = oversized_descriptions

            provider = OpenAIProvider(api_key="sk-test-key")
            context = {
                "mfg_part_num": "DCB518ASTS06G",
                "brand": "Diablo",
                "category": "Sanding Belts"
            }
            res = await provider.generate_descriptions(context, raw_desc="raw description")

            # INVOICE_DESC must be <= 40 chars
            assert len(res["INVOICE_DESC"]) <= 40
            # SHORT_DESC must be <= 80 chars
            assert len(res["SHORT_DESC"]) <= 80
            # MOBILE_DESC must be between 60 and 80 chars (padded)
            assert 60 <= len(res["MOBILE_DESC"]) <= 80

    asyncio.run(run())


# ==============================================================================
# 3. GeminiProvider Parity Unit Tests
# ==============================================================================

def test_gemini_extract_attributes_success(mock_lov_cache):
    """Gemini parity test for success path."""
    valid_gemini_response = {
        "candidates": [{
            "content": {
                "parts": [{
                    "text": json.dumps({
                        "department": "Abrasives",
                        "class": "Coated Abrasives",
                        "category": "Sanding Belts",
                        "attributes": [
                            {"name": "Grit", "value": "P80", "uom": None, "confidence": 0.95},
                            {"name": "Abrasive Material", "value": "Ceramic", "uom": None, "confidence": 0.93}
                        ]
                    })
                }]
            }
        }]
    }

    async def run():
        with patch("app.services.llm.provider.fetch_with_retry", new_callable=AsyncMock) as mock_fetch:
            mock_fetch.return_value = valid_gemini_response

            provider = GeminiProvider(api_key="gemini-test-key")
            result = await provider.extract_attributes(
                product_desc="High performance ceramic sanding belt P80",
                category="Sanding Belts",
                part_num="123",
                classpath=mock_lov_cache
            )

            assert result["department"] == "Abrasives"
            assert len(result["attributes"]) == 2
            attr_dict = {a["name"]: a["value"] for a in result["attributes"]}
            assert attr_dict["Grit"] == "P80"
            assert attr_dict["Abrasive Material"] == "Ceramic"

    asyncio.run(run())


def test_gemini_lov_validation_rejection(mock_lov_cache):
    """Gemini parity test for LOV rejection."""
    gemini_response_with_invalid = {
        "candidates": [{
            "content": {
                "parts": [{
                    "text": json.dumps({
                        "department": "Abrasives",
                        "class": "Coated Abrasives",
                        "category": "Sanding Belts",
                        "attributes": [
                            {"name": "Grit", "value": "P80", "uom": None, "confidence": 0.95},
                            {"name": "Abrasive Material", "value": "Plastic Foam", "uom": None, "confidence": 0.85}, # Rejected value
                            {"name": "Random Sensor", "value": "Yes", "uom": None, "confidence": 0.80} # Rejected label
                        ]
                    })
                }]
            }
        }]
    }

    async def run():
        with patch("app.services.llm.provider.fetch_with_retry", new_callable=AsyncMock) as mock_fetch:
            mock_fetch.return_value = gemini_response_with_invalid

            provider = GeminiProvider(api_key="gemini-test-key")
            result = await provider.extract_attributes(
                product_desc="High performance sanding belt P80 Plastic Foam",
                category="Sanding Belts",
                part_num="123",
                classpath=mock_lov_cache
            )

            attr_names = [a["name"] for a in result["attributes"]]
            assert "Grit" in attr_names
            assert "Abrasive Material" not in attr_names
            assert "Random Sensor" not in attr_names
            assert len(result["attributes"]) == 1

    asyncio.run(run())


def test_gemini_malformed_non_json_response_fallback(mock_lov_cache):
    """Gemini parity test for malformed non-JSON response fallback."""
    gemini_malformed = {
        "candidates": [{
            "content": {
                "parts": [{"text": "```Here is your output but no JSON: error```"}]
            }
        }]
    }

    async def run():
        with patch("app.services.llm.provider.fetch_with_retry", new_callable=AsyncMock) as mock_fetch:
            mock_fetch.return_value = gemini_malformed

            provider = GeminiProvider(api_key="gemini-test-key")
            result = await provider.extract_attributes(
                product_desc="High performance sanding belt P80",
                category="Sanding Belts",
                part_num="123",
                classpath=mock_lov_cache
            )

            assert isinstance(result, dict)
            assert "attributes" in result

    asyncio.run(run())


def test_gemini_retry_exhaustion_fallback(mock_lov_cache):
    """Gemini parity test for retry exhaustion fallback."""
    async def run():
        with patch("app.services.llm.provider.fetch_with_retry", new_callable=AsyncMock) as mock_fetch:
            mock_fetch.return_value = None

            provider = GeminiProvider(api_key="gemini-test-key")
            result = await provider.extract_attributes(
                product_desc="High performance sanding belt P80",
                category="Sanding Belts",
                part_num="123",
                classpath=mock_lov_cache
            )

            assert isinstance(result, dict)
            assert "attributes" in result

    asyncio.run(run())


def test_gemini_description_length_compliance():
    """Gemini parity test for description length compliance."""
    gemini_descriptions = {
        "candidates": [{
            "content": {
                "parts": [{
                    "text": json.dumps({
                        "INVOICE_DESC": "A" * 60, # > 40
                        "MOBILE_DESC": "Diablo Belt 123", # < 60
                        "SHORT_DESC": "B" * 120, # > 80
                        "LONG_DESC1": "C" * 1200, # > 1000
                        "RETAIL_DESC": "D" * 300, # > 255
                        "MARKETING_DESCRIPTION": "E" * 600 # > 500
                    })
                }]
            }
        }]
    }

    async def run():
        with patch("app.services.llm.provider.fetch_with_retry", new_callable=AsyncMock) as mock_fetch:
            mock_fetch.return_value = gemini_descriptions

            provider = GeminiProvider(api_key="gemini-test-key")
            context = {
                "mfg_part_num": "123",
                "brand": "Diablo",
                "category": "Sanding Belts"
            }
            res = await provider.generate_descriptions(context, raw_desc="raw")

            assert len(res["INVOICE_DESC"]) <= 40
            assert 60 <= len(res["MOBILE_DESC"]) <= 80
            assert len(res["SHORT_DESC"]) <= 80
            assert len(res["LONG_DESC1"]) <= 1000
            assert len(res["RETAIL_DESC"]) <= 255
            assert len(res["MARKETING_DESCRIPTION"]) <= 500

    asyncio.run(run())


# ==============================================================================
# 4. Retry Behavior Tests (Testing fetch_with_retry directly)
# ==============================================================================

def test_fetch_with_retry_succeeds_on_third_attempt():
    """
    Requirement 4 (Retry behavior): Mock HTTP calls to fail twice (500 Server Error)
    and succeed on the third attempt. Assert final result is correct and exactly 3 calls made.
    """
    success_response = MagicMock()
    success_response.raise_for_status.return_value = None
    success_response.json.return_value = {"status": "ok", "data": "success on attempt 3"}

    error_response = MagicMock(status_code=500, text="Internal Server Error")
    http_error = httpx.HTTPStatusError(message="500 Error", request=MagicMock(), response=error_response)

    call_count = 0

    async def mock_post(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count < 3:
            raise http_error
        return success_response

    async def run():
        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.post = mock_post

            result = await fetch_with_retry(
                url="https://api.openai.com/v1/chat/completions",
                json_payload={"test": "payload"},
                max_retries=3,
                base_delay=0.001  # Fast delay for test execution
            )

            assert result == {"status": "ok", "data": "success on attempt 3"}
            assert call_count == 3

    asyncio.run(run())


def test_fetch_with_retry_exhausts_and_raises_or_returns_none():
    """
    Requirement 5 (Underlying retry exhaustion): Mock HTTP calls to fail all 3 times.
    Assert fetch_with_retry handles exhaustion.
    """
    error_response = MagicMock(status_code=503, text="Service Unavailable")
    http_error = httpx.HTTPStatusError(message="503 Error", request=MagicMock(), response=error_response)

    call_count = 0

    async def mock_post_always_fails(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        raise http_error

    async def run():
        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.post = mock_post_always_fails

            with pytest.raises(httpx.HTTPStatusError):
                await fetch_with_retry(
                    url="https://api.openai.com/v1/chat/completions",
                    json_payload={"test": "payload"},
                    max_retries=3,
                    base_delay=0.001
                )

            assert call_count == 3

    asyncio.run(run())