import asyncio
import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.llm.provider import GeminiProvider


def test_gemini_enrich_from_manufacturer_success():
    """
    Test enrich_from_manufacturer with manufacturer='FRIGIDAIRE', mpn='PDSH4816AF'.
    Asserts found=True, source_url contains 'frigidaire.com', and grounding_sources are attached.
    """
    mock_payload = {
        "found": True,
        "source_url": "https://www.frigidaire.com/en/p/dishwashers/built-in-dishwashers/PDSH4816AF",
        "source_type": "manufacturer",
        "product_title": "Frigidaire Professional 24\" Built-In Dishwasher",
        "raw_specs": [
            {"label": "Width", "value": "24", "unit": "in"},
            {"label": "Noise Level", "value": "47", "unit": "dBA"},
            {"label": "Voltage Rating", "value": "120", "unit": "V"}
        ],
        "raw_description": "Frigidaire Professional built-in dishwasher with CleanBoost technology.",
        "image_urls": ["https://images.electrolux.com/products/PDSH4816AF/main.jpg"]
    }

    mock_response = MagicMock()
    mock_response.text = json.dumps(mock_payload)

    # Mock candidate and grounding metadata
    mock_chunk1 = MagicMock()
    mock_chunk1.web.uri = "https://www.frigidaire.com/en/p/dishwashers/built-in-dishwashers/PDSH4816AF"
    mock_chunk2 = MagicMock()
    mock_chunk2.web.uri = "https://www.frigidaire.com/en/owner-support/product-support/PDSH4816AF"

    mock_candidate = MagicMock()
    mock_candidate.grounding_metadata.grounding_chunks = [mock_chunk1, mock_chunk2]
    mock_candidate.grounding_metadata.source_flagging_uris = []
    mock_response.candidates = [mock_candidate]

    async def run():
        provider = GeminiProvider(api_key="test-gemini-key")

        with patch("google.genai.Client") as mock_client_cls:
            mock_client = MagicMock()
            mock_client.aio.models.generate_content = AsyncMock(return_value=mock_response)
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
            assert "grounding_sources" in result
            assert "https://www.frigidaire.com/en/p/dishwashers/built-in-dishwashers/PDSH4816AF" in result["grounding_sources"]

    asyncio.run(run())


def test_gemini_enrich_from_manufacturer_fallback_distributor():
    """
    Test enrich_from_manufacturer fallback distributor flow.
    """
    mock_payload = {
        "found": True,
        "source_url": "https://www.ajmadison.com/cgi-bin/ajmadison/PDSH4816AF.html",
        "source_type": "fallback_distributor",
        "product_title": "Frigidaire PDSH4816AF 24 Inch Built-In Dishwasher",
        "raw_specs": [
            {"label": "Width", "value": "24", "unit": "in"}
        ],
        "raw_description": "Fallback description",
        "image_urls": []
    }

    mock_response = MagicMock()
    mock_response.text = json.dumps(mock_payload)
    mock_candidate = MagicMock()
    mock_candidate.grounding_metadata.grounding_chunks = []
    mock_candidate.grounding_metadata.source_flagging_uris = []
    mock_response.candidates = [mock_candidate]

    async def run():
        provider = GeminiProvider(api_key="test-gemini-key")

        with patch("google.genai.Client") as mock_client_cls:
            mock_client = MagicMock()
            mock_client.aio.models.generate_content = AsyncMock(return_value=mock_response)
            mock_client_cls.return_value = mock_client

            result = await provider.enrich_from_manufacturer(
                manufacturer="FRIGIDAIRE",
                mpn="PDSH4816AF"
            )

            assert result["found"] is True
            assert "ajmadison.com" in result["source_url"]
            assert result["source_type"] == "fallback_distributor"

    asyncio.run(run())


def test_gemini_enrich_from_manufacturer_error_handling():
    """
    Test that API errors / exceptions return found=False without raising.
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
            assert "error" in result
            assert "API Network Timeout" in result["error"]

    asyncio.run(run())
