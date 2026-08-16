import logging
from typing import List, Dict, Any, Optional
from app.utils.file_parser import clean_placeholder

logger = logging.getLogger("app.repository")

class ProductRepository:
    """
    Data repository for storing products, enrichment state, attributes,
    validation results, and master data.
    """
    def __init__(self):
        self._products: Dict[int, Dict[str, Any]] = {}
        self._datasets: Dict[int, Dict[str, Any]] = {}
        self._next_product_id: int = 1
        self._next_dataset_id: int = 1

    def add_dataset(self, name: str, file_type: str, total_rows: int) -> Dict[str, Any]:
        dataset_id = self._next_dataset_id
        self._next_dataset_id += 1
        dataset_entry = {
            "id": dataset_id,
            "name": name,
            "file_type": file_type,
            "total_rows": total_rows,
            "created_at": "now"  # In a real DB this would be a timestamp
        }
        self._datasets[dataset_id] = dataset_entry
        return dataset_entry

    def get_all_datasets(self) -> List[Dict[str, Any]]:
        return list(self._datasets.values())

    def add_product(self, raw_data: Dict[str, Any], dataset_id: int = None) -> Dict[str, Any]:
        product_id = self._next_product_id
        self._next_product_id += 1
        
        product_entry = {
            "id": product_id,
            "dataset_id": dataset_id,
            "mfg_part_num": raw_data.get("Mfg_Part_Num", "").strip(),
            "raw_description": raw_data.get("Part_Desc", "").strip(),
            "raw_brand_e1": raw_data.get("E1_Brand", "").strip(),
            "raw_brand_unilog": raw_data.get("Unilog_Brand", "").strip(),
            "raw_brand_dib": raw_data.get("DIB_Brand", "").strip(),
            "raw_manufacturer": raw_data.get("Part_Manuf", "").strip(),
            "clean_brand_e1": clean_placeholder(raw_data.get("E1_Brand", "")),
            "clean_brand_unilog": clean_placeholder(raw_data.get("Unilog_Brand", "")),
            "clean_brand_dib": clean_placeholder(raw_data.get("DIB_Brand", "")),
            "clean_manufacturer": clean_placeholder(raw_data.get("Part_Manuf", "")),
            "status": "RAW",
            "enrichment": {
                "manufacturer": None,
                "brand": None,
                "department": None,
                "class": None,
                "category": None,
                "confidence_score": 0.0,
                "status": "RAW",
                "review_reasons": []
            },
            "attributes": [],
            "descriptions": {},
            "validation_results": []
        }
        self._products[product_id] = product_entry
        return product_entry

    def bulk_add_products(self, rows: List[Dict[str, Any]], dataset_id: int = None) -> List[Dict[str, Any]]:
        added = []
        for r in rows:
            added.append(self.add_product(r, dataset_id=dataset_id))
        return added

    def get_all_products(self, status_filter: Optional[str] = None, search_query: Optional[str] = None, dataset_id: Optional[int] = None) -> List[Dict[str, Any]]:
        result = list(self._products.values())
        
        if dataset_id is not None:
            result = [p for p in result if p.get("dataset_id") == dataset_id]
        
        if status_filter and status_filter.upper() != "ALL":
            result = [p for p in result if p.get("status", "").upper() == status_filter.upper()]
            
        if search_query:
            q = search_query.lower()
            result = [
                p for p in result
                if q in p["mfg_part_num"].lower() or q in p["raw_description"].lower() or q in p["raw_manufacturer"].lower()
            ]
            
        return result

    def get_product_by_id(self, product_id: int) -> Optional[Dict[str, Any]]:
        return self._products.get(product_id)

    def update_product(self, product_id: int, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if product_id in self._products:
            self._products[product_id].update(updates)
            return self._products[product_id]
        return None

    def get_stats(self, dataset_id: Optional[int] = None) -> Dict[str, Any]:
        products = self.get_all_products(dataset_id=dataset_id)
        total = len(products)
        if total == 0:
            return {
                "total_products": 0,
                "processed": 0,
                "high_confidence": 0,
                "medium_confidence": 0,
                "needs_review": 0,
                "total_attributes_extracted": 0,
                "lov_pass_rate": None
            }
            
        processed = sum(1 for p in products if p.get("status") in ["PROCESSED", "ENRICHED"])
        needs_review = sum(1 for p in products if p.get("status") == "NEEDS_REVIEW")
        high_conf = sum(1 for p in products if p.get("enrichment", {}).get("confidence_score", 0) >= 0.85)
        med_conf = sum(1 for p in products if 0.60 <= p.get("enrichment", {}).get("confidence_score", 0) < 0.85)

        total_attrs = 0
        passed_attrs = 0
        for p in products:
            for a in p.get("attributes", []):
                total_attrs += 1
                if a.get("validation_status") == "PASS":
                    passed_attrs += 1

        lov_pass_rate = round((passed_attrs / total_attrs * 100.0), 1) if total_attrs > 0 else None
        
        return {
            "total_products": total,
            "processed": processed,
            "high_confidence": high_conf,
            "medium_confidence": med_conf,
            "needs_review": needs_review,
            "total_attributes_extracted": total_attrs,
            "lov_pass_rate": lov_pass_rate
        }

    def clear(self):
        self._products.clear()
        self._datasets.clear()
        self._next_product_id = 1
        self._next_dataset_id = 1

repository = ProductRepository()
