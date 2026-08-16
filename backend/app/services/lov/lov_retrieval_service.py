import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import sessionmaker

from app.schemas.lov import LovEntry
from app.database.models import MasterUnicatLOV, MasterCategoryLOV
from scripts.db_helper import get_engine

logger = logging.getLogger("app.services.lov")

def normalize_classpath(classpath: str) -> str:
    if not classpath:
        return ""
    # Standardize separator and whitespace
    parts = [p.strip() for p in classpath.replace("->", ">").replace("/", ">").split(">") if p.strip()]
    return " > ".join(parts)

class LOVRetrievalService:
    def __init__(self):
        self._cache: Dict[str, List[LovEntry]] = {}

    def clear_cache(self):
        self._cache.clear()

    def get_lov_for_classpath(self, classpath: str) -> List[LovEntry]:
        """
        Fetches relevant LOV entries for a product classpath (Department -> Class -> Fine).
        1. Checks in-memory batch cache.
        2. Prefers dedicated sheets (FAUCETS_LOV, Fittings_LOV) when classpath matches faucets or fittings categories.
        3. Otherwise queries master_unicat_lov table for rows matching that classpath.
        4. Caches and returns list of LovEntry objects.
        """
        norm_cp = normalize_classpath(classpath)
        if not norm_cp:
            return []

        if norm_cp in self._cache:
            return self._cache[norm_cp]

        entries: List[LovEntry] = []
        cp_lower = norm_cp.lower()

        try:
            engine = get_engine()
            Session = sessionmaker(bind=engine)
            session = Session()

            # Check Requirement 2: Dedicated category sheet prioritization (Faucets / Fittings)
            cat_key = None
            if "faucet" in cp_lower:
                cat_key = "faucets"
            elif "fitting" in cp_lower:
                cat_key = "fittings"

            if cat_key:
                cat_rows = session.query(MasterCategoryLOV).filter(
                    MasterCategoryLOV.category_key == cat_key
                ).all()

                if cat_rows:
                    for r in cat_rows:
                        if r.attribute_name:
                            entries.append(LovEntry(
                                attribute_label=r.attribute_name,
                                attribute_values=r.allowed_value,
                                normalized_label=r.attribute_name.strip().lower(),
                                normalized_values=r.allowed_value.strip().lower() if r.allowed_value else None,
                                filtering="Y",
                                guidelines=r.description or r.remarks,
                                uom_standard=r.uom_standard,
                                classpath=norm_cp
                            ))

            # Query master_unicat_lov table for matching classpath if no dedicated category rows found
            if not entries:

                parts = [p.strip() for p in norm_cp.split(">")]
                fine_name = parts[-1] if len(parts) >= 3 else parts[-1]
                class_name = parts[1] if len(parts) >= 3 else (parts[0] if len(parts) == 2 else None)

                query = session.query(MasterUnicatLOV)
                unicat_rows = query.filter(
                    (MasterUnicatLOV.classpath == norm_cp) |
                    (MasterUnicatLOV.fine_category.ilike(fine_name))
                ).all()

                if not unicat_rows and class_name:
                    unicat_rows = query.filter(MasterUnicatLOV.class_name.ilike(class_name)).all()

                for r in unicat_rows:
                    if r.attribute_label:
                        entries.append(LovEntry(
                            attribute_label=r.attribute_label,
                            attribute_values=r.attribute_values,
                            normalized_label=r.normalized_label or r.attribute_label.strip().lower(),
                            normalized_values=r.normalized_values or (r.attribute_values.strip().lower() if r.attribute_values else None),
                            filtering=r.filtering or "N",
                            guidelines=r.guidelines or r.remarks,
                            uom_standard=None,
                            classpath=r.classpath or norm_cp
                        ))

            session.close()
        except Exception as e:
            logger.warning(f"Error retrieving LOV for classpath '{classpath}': {e}")

        # Store in batch cache
        self._cache[norm_cp] = entries
        return entries

lov_retrieval_service = LOVRetrievalService()

def get_lov_for_classpath(classpath: str) -> List[LovEntry]:
    return lov_retrieval_service.get_lov_for_classpath(classpath)
