from fastapi import APIRouter
from app.services.evaluation.evaluation_service import evaluation_service

router = APIRouter()

@router.get("/evaluation")
async def get_evaluation():
    return evaluation_service.evaluate()

import os
import json

@router.get("/evaluation/schema-breakdown")
async def get_schema_breakdown():
    return evaluation_service.get_252_column_schema_breakdown()

@router.get("/evaluation/runs")
async def get_evaluation_runs():
    try:
        if os.path.exists("evaluation_report.json"):
            with open("evaluation_report.json", "r") as f:
                data = json.load(f)
                return [data]
    except Exception:
        pass
    
    return [evaluation_service.evaluate()]

from app.database.repository import repository

@router.get("/evaluation/review-queue")
async def get_review_queue(dataset_id: int = None):
    products = repository.get_all_products(status_filter="NEEDS_REVIEW", dataset_id=dataset_id)
    
    # Sort by lowest confidence first
    products.sort(key=lambda p: p.get("enrichment", {}).get("confidence_score", 0.0))
    
    queue = []
    for p in products:
        flagged_fields = [
            v for v in p.get("validation_results", [])
            if v.get("status") in ["FAIL", "NEEDS_REVIEW"]
        ]
        
        # Also check attributes
        for a in p.get("attributes", []):
            if a.get("validation_status") in ["FAIL", "NEEDS_REVIEW"]:
                flagged_fields.append({
                    "field_name": a.get("name"),
                    "value": a.get("generated_value"),
                    "validation_type": "attribute_validation",
                    "status": a.get("validation_status"),
                    "confidence": a.get("confidence", 0.0),
                    "reason": a.get("reason", "Validation failed")
                })
                
        queue.append({
            "product_id": p["id"],
            "mfg_part_num": p["mfg_part_num"],
            "raw_description": p["raw_description"],
            "confidence_score": p.get("enrichment", {}).get("confidence_score", 0.0),
            "flagged_fields": flagged_fields,
            "review_reasons": p.get("enrichment", {}).get("review_reasons", [])
        })
        
    return {"queue": queue, "total": len(queue)}
