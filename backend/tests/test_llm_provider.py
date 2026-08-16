import pytest
import asyncio
from app.services.llm.provider import LLMService, MockLLMProvider
from app.schemas.lov import LovEntry
from app.services.lov.lov_retrieval_service import lov_retrieval_service

@pytest.fixture
def mock_lov_cache():
    # Setup some fake LOV in the cache to avoid DB calls during test
    lov_retrieval_service.clear_cache()
    cp = "Abrasives > Coated Abrasives > Sanding Belts"
    entries = [
        LovEntry(attribute_label="Grit", attribute_values="P80, P120", normalized_label="grit", normalized_values="p80, p120", filtering="Y", guidelines="", uom_standard=None, classpath=cp),
        LovEntry(attribute_label="Abrasive Material", attribute_values="Aluminum Oxide", normalized_label="abrasive material", normalized_values="aluminum oxide", filtering="Y", guidelines="", uom_standard=None, classpath=cp),
        LovEntry(attribute_label="Backing Weight", attribute_values="X-Weight", normalized_label="backing weight", normalized_values="x-weight", filtering="Y", guidelines="", uom_standard=None, classpath=cp)
    ]
    lov_retrieval_service._cache[cp] = entries
    return cp

def test_mock_llm_filters_hallucinated_attributes(mock_lov_cache):
    service = LLMService(provider_name="mock")
    
    # We pass a description that triggers the "sanding belt" mock logic
    res = asyncio.run(service.extract_attributes(
        product_desc="High performance sanding belt P80",
        category="Sanding Belts",
        part_num="123",
        classpath=mock_lov_cache
    ))
    
    attrs = res.get("attributes", [])
    
    # The MockLLMProvider for "sanding belt" attempts to return:
    # Grit, Abrasive Material, Backing Weight, and Pack Quantity.
    # But "Pack Quantity" is NOT in our mock_lov_cache!
    
    attr_names = [a["name"] for a in attrs]
    
    assert "Grit" in attr_names
    assert "Abrasive Material" in attr_names
    assert "Backing Weight" in attr_names
    
    # Pack Quantity should be filtered out because it's not in the permitted LOV
    assert "Pack Quantity" not in attr_names
