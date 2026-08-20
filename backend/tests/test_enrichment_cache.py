import os
import tempfile
import pytest
from app.services.enrichment_cache import EnrichmentCache


def test_enrichment_cache_crud():
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = os.path.join(tmpdir, "test_cache.db")
        cache = EnrichmentCache(db_path=db_path)

        assert cache.cache_size() == 0
        assert cache.get_cached("PDSH4816AF", "FRIGIDAIRE") is None

        # Store successful result
        sample_result = {
            "found": True,
            "product_title": "Frigidaire Dishwasher",
            "source_url": "https://www.frigidaire.com/p/123",
            "source_type": "manufacturer",
            "raw_specs": [{"label": "Width", "value": "24 in"}]
        }
        cache.set_cached("PDSH4816AF", "FRIGIDAIRE", sample_result)

        assert cache.cache_size() == 1

        # Retrieve (case insensitive MPN and manufacturer)
        cached = cache.get_cached("pdsh4816af", "Frigidaire")
        assert cached is not None
        assert cached["found"] is True
        assert cached["product_title"] == "Frigidaire Dishwasher"
        assert cached["cache_hit"] is True

        # Do not cache found=False results
        cache.set_cached("BAD_MPN", "UNKNOWN", {"found": False, "error": "Not found"})
        assert cache.cache_size() == 1

        # Clear cache
        cache.clear_cache()
        assert cache.cache_size() == 0
        assert cache.get_cached("pdsh4816af", "Frigidaire") is None
