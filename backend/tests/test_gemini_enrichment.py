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
    Stage 1: URL lookup
    Stage 2: Scrape page
    Stage 3: Spec extraction
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

    async def run():
        provider = GeminiProvider(api_key="test-gemini-key")

        with patch("google.genai.Client") as mock_client_cls, \
             patch("app.services.llm.provider.scrape_page_async", return_value="Scraped text with specs Width: 24 in Noise Level: 47 dBA"):

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
            assert "scrape_s" in result["stage_timings"]
            assert "spec_extraction_s" in result["stage_timings"]
            assert "grounding_sources" in result

    asyncio.run(run())


def test_gemini_enrich_from_manufacturer_stage1_failure_short_circuit():
    """
    Test that when Stage 1 fails to find URL, it returns stage_failed='url_lookup' immediately
    without calling Stage 2 or Stage 3.
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
             patch("app.services.llm.provider.scrape_page_async") as mock_scrape:

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
            # Assert scrape was never invoked
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
    mock_resp1.candidates = [MagicMock()]

    async def run():
        provider = GeminiProvider(api_key="test-gemini-key")

        with patch("google.genai.Client") as mock_client_cls, \
             patch("app.services.llm.provider.scrape_page_async", return_value=None), \
             patch.object(provider, "extract_specs_from_text") as mock_extract:

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
            assert "scrape_s" in result["stage_timings"]
            mock_extract.assert_not_called()

    asyncio.run(run())


def test_gemini_enrich_from_manufacturer_error_handling():
    """
    Test that API errors during Stage 1 return found=False without raising.
    """
    async def run():
        provider = GeminiProvider(api_key="test-gemini-key")

        with patch("google.genai.Client") as mock_client_cls:
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
