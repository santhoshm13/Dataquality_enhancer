import asyncio
import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.llm.provider import GeminiProvider


def test_gemini_find_manufacturer_url_stage1_success():
    """
    Test Stage 1: find_manufacturer_url returns found=True, URL, and source_type.
    """
    mock_payload = {
        "found": True,
        "url": "https://www.frigidaire.com/en/p/dishwashers/built-in-dishwashers/PDSH4816AF",
        "source_type": "manufacturer"
    }

    mock_response = MagicMock()
    mock_response.text = json.dumps(mock_payload)

    mock_chunk = MagicMock()
    mock_chunk.web.uri = "https://www.frigidaire.com/en/p/dishwashers/built-in-dishwashers/PDSH4816AF"
    mock_candidate = MagicMock()
    mock_candidate.grounding_metadata.grounding_chunks = [mock_chunk]
    mock_candidate.grounding_metadata.source_flagging_uris = []
    mock_response.candidates = [mock_candidate]

    async def run():
        provider = GeminiProvider(api_key="test-gemini-key")

        with patch("google.genai.Client") as mock_client_cls:
            mock_client = MagicMock()
            mock_client.aio.models.generate_content = AsyncMock(return_value=mock_response)
            mock_client_cls.return_value = mock_client

            result = await provider.find_manufacturer_url(
                manufacturer="FRIGIDAIRE",
                mpn="PDSH4816AF"
            )

            assert result["found"] is True
            assert result["url"] == "https://www.frigidaire.com/en/p/dishwashers/built-in-dishwashers/PDSH4816AF"
            assert result["source_type"] == "manufacturer"
            assert "https://www.frigidaire.com/en/p/dishwashers/built-in-dishwashers/PDSH4816AF" in result["grounding_sources"]

    asyncio.run(run())


def test_gemini_extract_specs_from_text_stage3_success():
    """
    Test Stage 3: extract_specs_from_text extracts specs without tools and attaches source_url.
    """
    mock_payload = {
        "product_title": "Frigidaire Professional 24\" Built-In Dishwasher",
        "raw_specs": [
            {"label": "Width", "value": "24", "unit": "in"},
            {"label": "Noise Level", "value": "47", "unit": "dBA"}
        ],
        "raw_description": "CleanBoost power wash built-in dishwasher.",
        "image_urls": ["https://images.electrolux.com/products/PDSH4816AF/main.jpg"]
    }

    mock_response = MagicMock()
    mock_response.text = json.dumps(mock_payload)
    mock_candidate = MagicMock()
    mock_response.candidates = [mock_candidate]

    async def run():
        provider = GeminiProvider(api_key="test-gemini-key")

        with patch("google.genai.Client") as mock_client_cls:
            mock_client = MagicMock()
            mock_client.aio.models.generate_content = AsyncMock(return_value=mock_response)
            mock_client_cls.return_value = mock_client

            page_text = "Frigidaire PDSH4816AF 24 in Built-in Dishwasher 47 dBA"
            source_url = "https://www.frigidaire.com/en/p/dishwashers/built-in-dishwashers/PDSH4816AF"

            result = await provider.extract_specs_from_text(
                mpn="PDSH4816AF",
                manufacturer="FRIGIDAIRE",
                page_text=page_text,
                source_url=source_url,
                source_type="manufacturer"
            )

            assert result["found"] is True
            assert result["source_url"] == source_url
            assert result["source_type"] == "manufacturer"
            assert result["product_title"] == "Frigidaire Professional 24\" Built-In Dishwasher"
            assert len(result["raw_specs"]) == 2

    asyncio.run(run())


def test_gemini_enrich_from_manufacturer_three_stage_success():
    """
    Test full 3-stage enrichment orchestration:
    Stage 1: URL lookup (Gemini google_search)
    Stage 1.5: URL validation (validate_url)
    Stage 2: Scrape page (scrape_page_with_fallback)
    Stage 3: Spec extraction (Gemini plain text)
    """
    stage1_payload = {
        "found": True,
        "url": "https://www.frigidaire.com/en/p/dishwashers/built-in-dishwashers/PDSH4816AF",
        "source_type": "manufacturer"
    }
    stage3_payload = {
        "product_title": "Frigidaire Professional 24\" Built-In Dishwasher",
        "raw_specs": [
            {"label": "Width", "value": "24", "unit": "in"},
            {"label": "Noise Level", "value": "47", "unit": "dBA"},
            {"label": "Voltage Rating", "value": "120", "unit": "V"}
        ],
        "raw_description": "Frigidaire Professional built-in dishwasher with CleanBoost technology.",
        "image_urls": ["https://images.electrolux.com/products/PDSH4816AF/main.jpg"]
    }

    mock_resp1 = MagicMock()
    mock_resp1.text = json.dumps(stage1_payload)
    mock_chunk = MagicMock()
    mock_chunk.web.uri = "https://www.frigidaire.com/en/p/dishwashers/built-in-dishwashers/PDSH4816AF"
    mock_cand1 = MagicMock()
    mock_cand1.grounding_metadata.grounding_chunks = [mock_chunk]
    mock_cand1.grounding_metadata.source_flagging_uris = []
    mock_resp1.candidates = [mock_cand1]

    mock_resp3 = MagicMock()
    mock_resp3.text = json.dumps(stage3_payload)
    mock_cand3 = MagicMock()
    mock_resp3.candidates = [mock_cand3]

    # Mock validate_url to return valid
    mock_validation_result = {
        "valid": True,
        "final_url": "https://www.frigidaire.com/en/p/dishwashers/built-in-dishwashers/PDSH4816AF",
        "status_code": 200,
        "redirect_chain": [],
        "rejection_reason": None,
    }

    async def run():
        provider = GeminiProvider(api_key="test-gemini-key")

        with patch("google.genai.Client") as mock_client_cls, \
             patch("app.services.llm.provider.validate_url", new_callable=AsyncMock, return_value=mock_validation_result), \
             patch("app.services.llm.provider.scrape_page_with_fallback", new_callable=AsyncMock, return_value="Scraped text with specs Width: 24 in Noise Level: 47 dBA"), \
             patch("app.services.llm.provider.enrichment_cache") as mock_cache:

            mock_cache.get_cached.return_value = None  # No cache hit
            mock_cache.set_cached.return_value = None

            mock_client = MagicMock()
            mock_client.aio.models.generate_content = AsyncMock(side_effect=[mock_resp1, mock_resp3])
            mock_client_cls.return_value = mock_client

            result = await provider.enrich_from_manufacturer(
                manufacturer="FRIGIDAIRE",
                mpn="PDSH4816AF"
            )

            assert result["found"] is True
            assert "frigidaire.com" in result["source_url"]
            assert result["source_type"] == "manufacturer"
            assert result["product_title"] == "Frigidaire Professional 24\" Built-In Dishwasher"
            assert len(result["raw_specs"]) == 3
            assert "stage_timings" in result
            assert "url_lookup_s" in result["stage_timings"]
            assert "url_validate_s" in result["stage_timings"]
            assert "scrape_s" in result["stage_timings"]
            assert "spec_extraction_s" in result["stage_timings"]
            assert "grounding_sources" in result

    asyncio.run(run())


def test_gemini_enrich_from_manufacturer_stage1_failure_short_circuit():
    """
    Test that when Stage 1 fails to find URL, it returns stage_failed='url_lookup' immediately
    without calling Stage 1.5, Stage 2, or Stage 3.
    """
    stage1_payload = {
        "found": False,
        "url": "",
        "source_type": "none"
    }
    mock_resp1 = MagicMock()
    mock_resp1.text = json.dumps(stage1_payload)
    mock_resp1.candidates = [MagicMock()]

    async def run():
        provider = GeminiProvider(api_key="test-gemini-key")

        with patch("google.genai.Client") as mock_client_cls, \
             patch("app.services.llm.provider.validate_url", new_callable=AsyncMock) as mock_validate, \
             patch("app.services.llm.provider.scrape_page_with_fallback", new_callable=AsyncMock) as mock_scrape, \
             patch("app.services.llm.provider.enrichment_cache") as mock_cache:

            mock_cache.get_cached.return_value = None  # No cache hit

            mock_client = MagicMock()
            mock_client.aio.models.generate_content = AsyncMock(return_value=mock_resp1)
            mock_client_cls.return_value = mock_client

            result = await provider.enrich_from_manufacturer(
                manufacturer="UNKNOWN_BRAND",
                mpn="NONEXISTENT_PART"
            )

            assert result["found"] is False
            assert result["stage_failed"] == "url_lookup"
            assert "url_lookup_s" in result["stage_timings"]
            # Assert validate_url and scrape were never invoked
            mock_validate.assert_not_called()
            mock_scrape.assert_not_called()

    asyncio.run(run())


def test_gemini_enrich_from_manufacturer_stage15_failure_short_circuit():
    """
    Test that when Stage 1.5 URL validation fails, it returns stage_failed='url_validation'
    without calling Stage 2 or Stage 3.
    """
    stage1_payload = {
        "found": True,
        "url": "https://www.example.com/item/123",
        "source_type": "fallback"
    }
    mock_resp1 = MagicMock()
    mock_resp1.text = json.dumps(stage1_payload)
    mock_cand1 = MagicMock()
    mock_cand1.grounding_metadata.grounding_chunks = []
    mock_cand1.grounding_metadata.source_flagging_uris = []
    mock_resp1.candidates = [mock_cand1]

    mock_validation_failed = {
        "valid": False,
        "final_url": "https://www.example.com/",
        "status_code": 200,
        "redirect_chain": ["https://www.example.com/item/123"],
        "rejection_reason": "redirected_to_homepage",
    }

    async def run():
        provider = GeminiProvider(api_key="test-gemini-key")

        with patch("google.genai.Client") as mock_client_cls, \
             patch("app.services.llm.provider.validate_url", new_callable=AsyncMock, return_value=mock_validation_failed), \
             patch("app.services.llm.provider.scrape_page_with_fallback", new_callable=AsyncMock) as mock_scrape, \
             patch("app.services.llm.provider.enrichment_cache") as mock_cache:

            mock_cache.get_cached.return_value = None

            mock_client = MagicMock()
            mock_client.aio.models.generate_content = AsyncMock(return_value=mock_resp1)
            mock_client_cls.return_value = mock_client

            result = await provider.enrich_from_manufacturer(
                manufacturer="BRAND",
                mpn="MPN123"
            )

            assert result["found"] is False
            assert result["stage_failed"] == "url_validation"
            assert "redirected_to_homepage" in result["review_reason"]
            assert result["review_status"] == "NEEDS_HUMAN_REVIEW"
            # Scrape should never be called
            mock_scrape.assert_not_called()

    asyncio.run(run())


def test_gemini_enrich_from_manufacturer_stage2_failure_short_circuit():
    """
    Test that when Stage 2 fails to scrape (returns None/empty), it returns stage_failed='scrape'
    immediately without calling Stage 3.
    """
    stage1_payload = {
        "found": True,
        "url": "https://www.example.com/item/123",
        "source_type": "fallback"
    }
    mock_resp1 = MagicMock()
    mock_resp1.text = json.dumps(stage1_payload)
    mock_cand1 = MagicMock()
    mock_cand1.grounding_metadata.grounding_chunks = []
    mock_cand1.grounding_metadata.source_flagging_uris = []
    mock_resp1.candidates = [mock_cand1]

    mock_validation_ok = {
        "valid": True,
        "final_url": "https://www.example.com/item/123",
        "status_code": 200,
        "redirect_chain": [],
        "rejection_reason": None,
    }

    async def run():
        provider = GeminiProvider(api_key="test-gemini-key")

        with patch("google.genai.Client") as mock_client_cls, \
             patch("app.services.llm.provider.validate_url", new_callable=AsyncMock, return_value=mock_validation_ok), \
             patch("app.services.llm.provider.scrape_page_with_fallback", new_callable=AsyncMock, return_value=None), \
             patch.object(provider, "extract_specs_from_text") as mock_extract, \
             patch("app.services.llm.provider.enrichment_cache") as mock_cache:

            mock_cache.get_cached.return_value = None

            mock_client = MagicMock()
            mock_client.aio.models.generate_content = AsyncMock(return_value=mock_resp1)
            mock_client_cls.return_value = mock_client

            result = await provider.enrich_from_manufacturer(
                manufacturer="BRAND",
                mpn="MPN123"
            )

            assert result["found"] is False
            assert result["stage_failed"] == "scrape"
            assert result["source_url"] == "https://www.example.com/item/123"
            assert result["source_type"] == "fallback"
            assert "url_lookup_s" in result["stage_timings"]
            assert "url_validate_s" in result["stage_timings"]
            assert "scrape_s" in result["stage_timings"]
            assert result["review_status"] == "NEEDS_HUMAN_REVIEW"
            mock_extract.assert_not_called()

    asyncio.run(run())


def test_gemini_enrich_from_manufacturer_error_handling():
    """
    Test that API errors during Stage 1 return found=False without raising.
    """
    async def run():
        provider = GeminiProvider(api_key="test-gemini-key")

        with patch("google.genai.Client") as mock_client_cls, \
             patch("app.services.llm.provider.enrichment_cache") as mock_cache:

            mock_cache.get_cached.return_value = None

            mock_client = MagicMock()
            mock_client.aio.models.generate_content = AsyncMock(side_effect=RuntimeError("API Network Timeout"))
            mock_client_cls.return_value = mock_client

            result = await provider.enrich_from_manufacturer(
                manufacturer="FRIGIDAIRE",
                mpn="PDSH4816AF"
            )

            assert result["found"] is False
            assert result["stage_failed"] == "url_lookup"
            assert "API Network Timeout" in result.get("error", "")

    asyncio.run(run())



