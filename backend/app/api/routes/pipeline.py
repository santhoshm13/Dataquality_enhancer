import asyncio
import logging
import uuid
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, status
from pydantic import BaseModel

from app.database.repository import repository
from app.pipeline.enrichment_pipeline import pipeline_engine

logger = logging.getLogger("app.pipeline.runner")

router = APIRouter()

# In-memory registry for tracking batch jobs
jobs_store: Dict[str, Dict[str, Any]] = {}

class PipelineRunResponse(BaseModel):
    job_id: str
    dataset_id: Optional[int] = None
    status: str
    total_rows: int
    message: str

class PipelineStatusResponse(BaseModel):
    job_id: str
    dataset_id: Optional[int] = None
    status: str  # PENDING, RUNNING, COMPLETED, FAILED
    total_rows: int
    processed_rows: int
    success_count: int
    failed_count: int
    percent_complete: float
    current_product: Optional[str] = None
    errors: List[Dict[str, Any]] = []

async def execute_batch_enrichment(job_id: str, dataset_id: Optional[int] = None, concurrency: int = 5):
    """
    Asynchronously processes all rows in the dataset, updating progress and capturing errors.
    """
    job = jobs_store.get(job_id)
    if not job:
        return

    job["status"] = "RUNNING"
    all_products = repository.get_all_products(dataset_id=dataset_id)
    total_rows = len(all_products)
    job["total_rows"] = total_rows

    logger.info(f"[Job {job_id}] Starting batch enrichment for dataset {dataset_id}. Total rows received: {total_rows}")

    if total_rows == 0:
        job["status"] = "COMPLETED"
        logger.info(f"[Job {job_id}] No rows found for dataset {dataset_id}. Job completed immediately.")
        return

    semaphore = asyncio.Semaphore(concurrency)

    async def process_single_row(idx: int, product: Dict[str, Any]):
        p_id = product["id"]
        mpn = product.get("mfg_part_num", "")
        async with semaphore:
            try:
                job["current_product"] = f"{mpn} ({idx + 1}/{total_rows})"
                enriched = await pipeline_engine.run_pipeline(product)
                repository.update_product(p_id, enriched)
                job["success_count"] += 1
            except Exception as e:
                job["failed_count"] += 1
                err_entry = {
                    "product_id": p_id,
                    "mfg_part_num": mpn,
                    "error": str(e)
                }
                job["errors"].append(err_entry)
                logger.error(f"[Job {job_id}] Error processing row {idx + 1}/{total_rows} (ID: {p_id}, MPN: {mpn}): {e}")
            finally:
                job["processed_rows"] += 1
                if job["processed_rows"] % 50 == 0 or job["processed_rows"] == total_rows:
                    logger.info(
                        f"[Job {job_id}] Progress: {job['processed_rows']}/{total_rows} "
                        f"({job['success_count']} success, {job['failed_count']} failed)"
                    )

    tasks = [process_single_row(i, p) for i, p in enumerate(all_products)]
    await asyncio.gather(*tasks, return_exceptions=True)

    job["status"] = "COMPLETED"
    job["current_product"] = None
    logger.info(
        f"[Job {job_id}] Finished batch enrichment! Total received: {total_rows}, "
        f"Processed: {job['processed_rows']}, Success: {job['success_count']}, Failed: {job['failed_count']}"
    )


@router.post("/pipeline/run", response_model=PipelineRunResponse)
async def run_pipeline_batch(
    background_tasks: BackgroundTasks,
    dataset_id: Optional[int] = Query(None, description="Dataset ID to process"),
    concurrency: int = Query(5, ge=1, le=20, description="Concurrent enrichment workers")
):
    products = repository.get_all_products(dataset_id=dataset_id)
    total = len(products)

    if total == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No products found in the selected dataset to enrich."
        )

    job_id = str(uuid.uuid4())
    jobs_store[job_id] = {
        "job_id": job_id,
        "dataset_id": dataset_id,
        "status": "PENDING",
        "total_rows": total,
        "processed_rows": 0,
        "success_count": 0,
        "failed_count": 0,
        "current_product": None,
        "errors": []
    }

    # Launch immediate asyncio task
    asyncio.create_task(execute_batch_enrichment(job_id, dataset_id, concurrency))

    return PipelineRunResponse(
        job_id=job_id,
        dataset_id=dataset_id,
        status="RUNNING",
        total_rows=total,
        message=f"Enrichment pipeline started for all {total} rows."
    )


@router.get("/pipeline/status", response_model=PipelineStatusResponse)
async def get_pipeline_status(
    job_id: Optional[str] = Query(None, description="Specific job ID to check"),
    dataset_id: Optional[int] = Query(None, description="Check latest job for dataset")
):
    target_job = None
    if job_id and job_id in jobs_store:
        target_job = jobs_store[job_id]
    elif dataset_id is not None:
        # Find latest job for dataset
        for j in reversed(list(jobs_store.values())):
            if j.get("dataset_id") == dataset_id:
                target_job = j
                break

    if not target_job:
        # Check if there is any active job
        if jobs_store:
            target_job = list(jobs_store.values())[-1]
        else:
            return PipelineStatusResponse(
                job_id="none",
                dataset_id=dataset_id,
                status="IDLE",
                total_rows=0,
                processed_rows=0,
                success_count=0,
                failed_count=0,
                percent_complete=100.0,
                errors=[]
            )

    total = target_job.get("total_rows", 0)
    processed = target_job.get("processed_rows", 0)
    percent = round((processed / total) * 100.0, 1) if total > 0 else 100.0

    return PipelineStatusResponse(
        job_id=target_job["job_id"],
        dataset_id=target_job.get("dataset_id"),
        status=target_job.get("status", "IDLE"),
        total_rows=total,
        processed_rows=processed,
        success_count=target_job.get("success_count", 0),
        failed_count=target_job.get("failed_count", 0),
        percent_complete=percent,
        current_product=target_job.get("current_product"),
        errors=target_job.get("errors", [])
    )
