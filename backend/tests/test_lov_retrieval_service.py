import pytest
from app.services.lov.lov_retrieval_service import get_lov_for_classpath, lov_retrieval_service
from app.schemas.lov import LovEntry

def test_get_lov_for_classpath_returns_only_matching_attributes():
    lov_retrieval_service.clear_cache()
    cp = "Plumbing > Pipe Fittings > Brass Fittings"
    entries = get_lov_for_classpath(cp)

    assert isinstance(entries, list)
    assert len(entries) > 0
    assert len(entries) < 161000  # Asserts only matching attributes returned, not 161k full table

    for entry in entries:
        assert isinstance(entry, LovEntry)
        assert entry.attribute_label is not None

def test_get_lov_for_classpath_prefers_dedicated_category_sheets():
    lov_retrieval_service.clear_cache()
    # Faucets classpath should prefer dedicated FAUCETS_LOV sheet records
    cp_faucets = "Plumbing > Faucets > Kitchen Faucets"
    entries = get_lov_for_classpath(cp_faucets)

    assert len(entries) > 0
    attr_labels = [e.attribute_label for e in entries]
    assert "Finish" in attr_labels or "Flow Rate" in attr_labels or "Mounting Type" in attr_labels

def test_lov_retrieval_caching():
    lov_retrieval_service.clear_cache()
    cp = "Plumbing > Faucets > Kitchen Faucets"

    res1 = get_lov_for_classpath(cp)
    assert cp in lov_retrieval_service._cache

    res2 = get_lov_for_classpath(cp)
    assert res1 is res2  # Identical cached reference returned
