from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query, status
from app.database.repository import repository
from app.pipeline.enrichment_pipeline import pipeline_engine
from app.schemas.product import ProductListResponse, ProductListItem, ProductDetailResponse

router = APIRouter()

@router.get("/products", response_model=ProductListResponse)
async def get_products(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    search: Optional[str] = None,
    dataset_id: Optional[int] = None
):
    all_products = repository.get_all_products(status_filter=status, search_query=search, dataset_id=dataset_id)
    total = len(all_products)
    
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    page_items = all_products[start_idx:end_idx]

    items = []
    for p in page_items:
        enrich = p.get("enrichment", {})
        items.append(ProductListItem(
            id=p["id"],
            mfg_part_num=p["mfg_part_num"],
            raw_description=p["raw_description"],
            brand=enrich.get("brand"),
            manufacturer=enrich.get("manufacturer"),
            category=enrich.get("category"),
            confidence_score=enrich.get("confidence_score", 0.0),
            status=p.get("status", "RAW"),
            source_url=p.get("source_url") or enrich.get("source_url"),
            source_type=p.get("source_type") or enrich.get("source_type"),
            grounding_sources=p.get("grounding_sources") or enrich.get("grounding_sources", []),
            found=p.get("found", enrich.get("found", None))
        ))

    return ProductListResponse(
        total=total,
        page=page,
        limit=limit,
        items=items
    )

@router.get("/products/{product_id}", response_model=ProductDetailResponse)
async def get_product_by_id(product_id: int):
    product = repository.get_product_by_id(product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID {product_id} not found."
        )

    enrich = product.get("enrichment", {})
    return ProductDetailResponse(
        id=product["id"],
        mfg_part_num=product["mfg_part_num"],
        raw_description=product["raw_description"],
        raw_brand_e1=product.get("raw_brand_e1"),
        raw_brand_unilog=product.get("raw_brand_unilog"),
        raw_brand_dib=product.get("raw_brand_dib"),
        raw_manufacturer=product.get("raw_manufacturer"),
        status=product.get("status", "RAW"),
        source_url=product.get("source_url") or enrich.get("source_url"),
        source_type=product.get("source_type") or enrich.get("source_type"),
        grounding_sources=product.get("grounding_sources") or enrich.get("grounding_sources", []),
        found=product.get("found", enrich.get("found", None)),
        enrichment={
            "manufacturer": enrich.get("manufacturer"),
            "brand": enrich.get("brand"),
            "department": enrich.get("department"),
            "class": enrich.get("class"),
            "category": enrich.get("category"),
            "confidence_score": enrich.get("confidence_score", 0.0),
            "status": enrich.get("status", "RAW"),
            "source_url": product.get("source_url") or enrich.get("source_url"),
            "source_type": product.get("source_type") or enrich.get("source_type"),
            "grounding_sources": product.get("grounding_sources") or enrich.get("grounding_sources", []),
            "found": product.get("found", enrich.get("found", None))
        },
        attributes=product.get("attributes", []),
        descriptions=product.get("descriptions", {}),
        validation_results=product.get("validation_results", [])
    )

@router.post("/products/{product_id}/enrich")
async def enrich_product(product_id: int):
    product = repository.get_product_by_id(product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID {product_id} not found."
        )

    enriched = await pipeline_engine.run_pipeline(product)
    repository.update_product(product_id, enriched)
    return enriched

@router.post("/products/{product_id}/validate")
async def validate_product(product_id: int):
    product = repository.get_product_by_id(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"product_id": product_id, "status": "VALIDATED", "validation_results": product.get("validation_results", [])}

@router.get("/products/{product_id}/validation")
async def get_product_validation(product_id: int):
    product = repository.get_product_by_id(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"product_id": product_id, "results": product.get("validation_results", [])}

@router.get("/products/{product_id}/attributes")
async def get_product_attributes(product_id: int):
    product = repository.get_product_by_id(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"product_id": product_id, "attributes": product.get("attributes", [])}

@router.get("/datasets")
async def get_datasets():
    return repository.get_all_datasets()
