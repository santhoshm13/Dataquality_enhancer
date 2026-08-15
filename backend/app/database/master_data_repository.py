import logging
from typing import Dict, Any, List, Optional, Set, Tuple

logger = logging.getLogger("app.master_data_repository")

class MasterDataRepository:
    """
    Indexed repository for official master reference data.
    Provides O(1) lookups and indexed search structures.
    """
    def __init__(self):
        # Master Data Stores
        self.manufacturers: Dict[str, Dict[str, Any]] = {}  # norm_name -> record
        self.brands: Dict[str, Dict[str, Any]] = {}         # norm_name -> record
        self.taxonomy: List[Dict[str, Any]] = []
        self.lov_attributes: Dict[Tuple[str, str], Dict[str, Any]] = {} # (norm_attr, norm_val) -> record
        self.uom_standards: Dict[str, Dict[str, Any]] = {}   # norm_uom -> record
        self.decimal_fractions: Dict[str, str] = {}         # "0.5" -> "1/2"
        self.category_lovs: Dict[str, Dict[str, Set[str]]] = {} # category -> attr_norm -> set(val_norm)

        # Index structures
        self.idx_mfg_norm: Set[str] = set()
        self.idx_brand_norm: Set[str] = set()
        self.idx_taxonomy_fine: Dict[str, Dict[str, Any]] = {}
        self.idx_uom_code: Set[str] = set()
        self.idx_fraction_dec: Dict[float, str] = {}

    def clear(self):
        self.manufacturers.clear()
        self.brands.clear()
        self.taxonomy.clear()
        self.lov_attributes.clear()
        self.uom_standards.clear()
        self.decimal_fractions.clear()
        self.category_lovs.clear()

        self.idx_mfg_norm.clear()
        self.idx_brand_norm.clear()
        self.idx_taxonomy_fine.clear()
        self.idx_uom_code.clear()
        self.idx_fraction_dec.clear()

    # Manufacturers
    def add_manufacturer(self, mfg_id: str, canonical_name: str):
        norm = canonical_name.strip().lower()
        rec = {
            "id": mfg_id,
            "canonical_name": canonical_name.strip(),
            "normalized_name": norm
        }
        self.manufacturers[norm] = rec
        self.idx_mfg_norm.add(norm)

    def is_valid_manufacturer(self, name: str) -> bool:
        return name.strip().lower() in self.idx_mfg_norm

    # Brands
    def add_brand(self, brand_id: str, canonical_name: str, mfg_name: Optional[str] = None):
        norm = canonical_name.strip().lower()
        rec = {
            "id": brand_id,
            "canonical_name": canonical_name.strip(),
            "normalized_name": norm,
            "manufacturer_name": mfg_name
        }
        self.brands[norm] = rec
        self.idx_brand_norm.add(norm)

    def is_valid_brand(self, name: str) -> bool:
        return name.strip().lower() in self.idx_brand_norm

    # Taxonomy
    def add_taxonomy(self, dept: str, class_name: str, fine_category: str, classpath: str):
        rec = {
            "dept": dept.strip(),
            "class": class_name.strip(),
            "fine": fine_category.strip(),
            "classpath": classpath.strip()
        }
        self.taxonomy.append(rec)
        self.idx_taxonomy_fine[fine_category.strip().lower()] = rec

    # LOV Attributes
    def add_lov_attribute(self, dept: str, class_name: str, fine: str, attr_name: str, approved_val: str, remarks: str = ""):
        norm_attr = attr_name.strip().lower()
        norm_val = approved_val.strip().lower()
        rec = {
            "dept": dept,
            "class": class_name,
            "fine": fine,
            "attr_name": attr_name.strip(),
            "approved_val": approved_val.strip(),
            "remarks": remarks
        }
        self.lov_attributes[(norm_attr, norm_val)] = rec

    # UOM Standards
    def add_uom_standard(self, uom_code: str, uom_name: str, abbrev: str, category: str):
        norm_code = uom_code.strip().lower()
        rec = {
            "code": uom_code.strip(),
            "name": uom_name.strip(),
            "abbrev": abbrev.strip(),
            "category": category.strip()
        }
        self.uom_standards[norm_code] = rec
        self.idx_uom_code.add(norm_code)
        self.idx_uom_code.add(abbrev.strip().lower())

    def is_valid_uom(self, uom: str) -> bool:
        return uom.strip().lower() in self.idx_uom_code

    # Decimal Fractions
    def add_decimal_fraction(self, decimal_str: str, fraction_str: str):
        self.decimal_fractions[decimal_str.strip()] = fraction_str.strip()
        try:
            val = float(decimal_str)
            self.idx_fraction_dec[val] = fraction_str.strip()
        except ValueError:
            pass

    def get_fraction(self, decimal_val: str) -> Optional[str]:
        if decimal_val in self.decimal_fractions:
            return self.decimal_fractions[decimal_val]
        try:
            f = float(decimal_val)
            return self.idx_fraction_dec.get(f)
        except ValueError:
            return None

    # Category Specific LOVs
    def add_category_lov(self, category: str, attr_name: str, val: str):
        cat = category.strip().lower()
        attr = attr_name.strip().lower()
        v = val.strip().lower()
        if cat not in self.category_lovs:
            self.category_lovs[cat] = {}
        if attr not in self.category_lovs[cat]:
            self.category_lovs[cat][attr] = set()
        self.category_lovs[cat][attr].add(v)

    def get_stats(self) -> Dict[str, Any]:
        return {
            "manufacturers_count": len(self.manufacturers),
            "brands_count": len(self.brands),
            "taxonomy_count": len(self.taxonomy),
            "lov_attributes_count": len(self.lov_attributes),
            "uom_standards_count": len(self.uom_standards),
            "decimal_fractions_count": len(self.decimal_fractions),
            "category_lovs_count": len(self.category_lovs)
        }

master_repository = MasterDataRepository()
