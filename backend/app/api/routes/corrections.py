"""
Corrections API - Human-in-the-Loop Feedback Loop

Endpoints:
  POST /api/products/{product_id}/correct   - Persist a human correction for a field
  GET  /api/corrections                     - List all learned overrides
"""
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from app.database.repository import repository

logger = logging.getLogger("app.api.corrections")
router = APIRouter()


class CorrectionRequest(BaseModel):
    field_name: str = Field(..., description="The output field being corrected (e.g., 'brand', 'manufacturer', 'Fine')")
    corrected_value: str = Field(..., description="The canonical corrected value accepted by the human reviewer")
    original_value: Optional[str] = Field("", description="The original pipeline-generated value that was wrong")
    corrected_by: Optional[str] = Field("human_reviewer", description="Who made this correction")


@router.post("/products/{product_id}/correct")
async def correct_product_field(product_id: int, body: CorrectionRequest):
    """
    Persist a human correction for a specific field on a product.
    Immediately applied to the product enrichment data, stored as a learned
    override that future pipeline runs will check before fuzzy matching.
    """
    product = repository.get_product_by_id(product_id)
    if not product:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found.")

    correction = repository.save_correction(
        product_id=product_id,
        field_name=body.field_name,
        corrected_value=body.corrected_value,
        original_value=body.original_value or "",
        corrected_by=body.corrected_by or "human_reviewer"
    )

    logger.info(
        f"Human correction recorded: product_id={product_id} "
        f"field='{body.field_name}' '{body.original_value}' => '{body.corrected_value}'"
    )

    return {
        "status": "accepted",
        "correction": correction,
        "message": (
            f"Field '{body.field_name}' corrected to '{body.corrected_value}'. "
            f"This override will be applied automatically on future pipeline runs."
        )
    }


@router.get("/corrections")
async def list_corrections(product_id: Optional[int] = None):
    """
    List all learned overrides (optionally filtered by product).
    These corrections represent the human-in-the-loop feedback loop.
    """
    corrections = repository.get_corrections(product_id=product_id)
    return {
        "total": len(corrections),
        "corrections": corrections
    }
