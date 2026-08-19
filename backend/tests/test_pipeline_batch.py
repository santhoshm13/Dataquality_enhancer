import pytest
import asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database.repository import repository

@pytest.mark.anyio
async def test_batch_pipeline_runs_all_rows_and_tracks_progress():
    # Setup test dataset with 15 test items (more than previous 10-row limit)
    test_rows = [
        {
            "Mfg_Part_Num": f"TEST-BATCH-{i}",
            "Part_Desc": f"Dishwasher Built-in Stainless Steel Model {i}",
            "E1_Brand": "FRIGIDAIRE",
            "Unilog_Brand": "",
            "DIB_Brand": "",
            "Part_Manuf": "Frigidaire"
        }
        for i in range(1, 16)
    ]
    dataset = repository.add_dataset(name="batch_test.csv", file_type="csv", total_rows=len(test_rows))
    repository.bulk_add_products(test_rows, dataset_id=dataset["id"])

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Trigger batch run
        res = await ac.post(f"/api/pipeline/run?dataset_id={dataset['id']}")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "RUNNING"
        assert data["total_rows"] == 15
        job_id = data["job_id"]

        # Poll status until COMPLETED
        for _ in range(30):
            status_res = await ac.get(f"/api/pipeline/status?job_id={job_id}")
            assert status_res.status_code == 200
            s_data = status_res.json()
            if s_data["status"] == "COMPLETED":
                break
            await asyncio.sleep(0.1)

        assert s_data["status"] == "COMPLETED"
        assert s_data["total_rows"] == 15
        assert s_data["processed_rows"] == 15
        assert s_data["success_count"] == 15
        assert s_data["failed_count"] == 0
        assert s_data["percent_complete"] == 100.0

@pytest.mark.anyio
async def test_product_detail_and_list_include_source_and_provenance():
    # Verify product endpoint returns source fields
    test_row = {
        "Mfg_Part_Num": "FFCD2418US",
        "Part_Desc": "24 in. Stainless Steel Built-In Dishwasher",
        "E1_Brand": "FRIGIDAIRE",
        "Unilog_Brand": "",
        "DIB_Brand": "",
        "Part_Manuf": "Frigidaire",
    }
    p = repository.add_product(test_row, dataset_id=99)
    p_id = p["id"]

    # Enrich product
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        enrich_res = await ac.post(f"/api/products/{p_id}/enrich")
        assert enrich_res.status_code == 200

        # Check list endpoint
        list_res = await ac.get("/api/products?dataset_id=99")
        assert list_res.status_code == 200
        items = list_res.json()["items"]
        item = next(item for item in items if item["id"] == p_id)
        assert "source_url" in item
        assert "source_type" in item
        assert "grounding_sources" in item

        # Check detail endpoint
        detail_res = await ac.get(f"/api/products/{p_id}")
        assert detail_res.status_code == 200
        detail = detail_res.json()
        assert "source_url" in detail
        assert "source_type" in detail
        assert "grounding_sources" in detail
        assert "enrichment" in detail
        assert "source_url" in detail["enrichment"]
