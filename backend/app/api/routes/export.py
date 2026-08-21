from typing import Optional
from fastapi import APIRouter, Query, HTTPException, status
from fastapi.responses import Response
from app.database.repository import repository
from app.pipeline.delivery_formatter import delivery_generator
from app.services.audit_trail import generate_audit_report, generate_audit_csv
import json

router = APIRouter()

@router.post("/export")
@router.get("/export")
async def export_delivery_file(
    format: Optional[str] = Query("csv"),
    dataset_id: Optional[int] = Query(None, description="Dataset ID to export")
):
    products = repository.get_all_products(dataset_id=dataset_id)
    fmt = (format or "csv").lower().strip()

    if fmt == "csv":
        csv_data = delivery_generator.generate_csv_string(products)
        return Response(
            content=csv_data,
            media_type="text/csv",
            headers={
                "Content-Disposition": "attachment; filename=Unihack_Enriched_Delivery_Format.csv"
            }
        )
    elif fmt in ["excel", "xlsx"]:
        excel_bytes = delivery_generator.generate_excel_bytes(products)
        return Response(
            content=excel_bytes,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": "attachment; filename=Unihack_Enriched_Delivery_Format.xlsx"
            }
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported export format '{fmt}'. Supported formats: csv, excel (xlsx)"
        )


@router.get("/export/audit/{product_id}")
async def export_single_audit(product_id: int):
    """Export a per-product provenance audit report as JSON."""
    product = repository.get_product(product_id)
    if not product:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found")
    report = generate_audit_report(product)
    return Response(
        content=json.dumps(report, indent=2, default=str),
        media_type="application/json",
        headers={
            "Content-Disposition": f"attachment; filename=audit_product_{product_id}.json"
        }
    )


@router.get("/export/audit")
async def export_batch_audit(
    dataset_id: Optional[int] = Query(None),
    format: Optional[str] = Query("json")
):
    """Export provenance audit trail for all (or a dataset's) products.
    format=json → JSON array; format=csv → flattened CSV.
    """
    products = repository.get_all_products(dataset_id=dataset_id)
    if not products:
        raise HTTPException(status_code=404, detail="No products found")

    fmt = (format or "json").lower().strip()
    if fmt == "csv":
        csv_data = generate_audit_csv(products)
        return Response(
            content=csv_data,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=audit_trail.csv"}
        )
    elif fmt == "pdf":
        raise HTTPException(status_code=501, detail="PDF export requires reportlab. Install with: pip install reportlab")
    else:
        reports = [generate_audit_report(p) for p in products]
        return Response(
            content=json.dumps(reports, indent=2, default=str),
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=audit_trail.json"}
        )
