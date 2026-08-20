"""
Per-row enrichment cache backed by SQLite.
Avoids re-enriching the same (MPN, manufacturer) pair across pipeline runs.
"""

import json
import logging
import os
import sqlite3
from datetime import datetime, timezone
from typing import Any, Dict, Optional

logger = logging.getLogger("app.services.enrichment_cache")

# Default DB location — sits alongside other data files
_DEFAULT_DB_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))),
    "data", "enrichment_cache.db"
)


class EnrichmentCache:
    """SQLite-backed cache for manufacturer enrichment results."""

    def __init__(self, db_path: str = _DEFAULT_DB_PATH):
        self.db_path = db_path
        self._ensure_db()

    def _ensure_db(self):
        """Create the cache database and table if they don't exist."""
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        try:
            conn = sqlite3.connect(self.db_path)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS enrichment_results (
                    mpn TEXT NOT NULL,
                    manufacturer TEXT NOT NULL,
                    result_json TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    PRIMARY KEY (mpn, manufacturer)
                )
            """)
            conn.commit()
            conn.close()
            logger.info(f"Enrichment cache initialized at {self.db_path}")
        except Exception as e:
            logger.warning(f"Failed to initialize enrichment cache: {e}")

    def _normalize_key(self, value: str) -> str:
        """Normalize cache keys — lowercase and strip whitespace."""
        return (value or "").strip().lower()

    def get_cached(self, mpn: str, manufacturer: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve cached enrichment result for the given MPN + manufacturer pair.
        Returns None if not cached.
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.execute(
                "SELECT result_json FROM enrichment_results WHERE mpn = ? AND manufacturer = ?",
                (self._normalize_key(mpn), self._normalize_key(manufacturer))
            )
            row = cursor.fetchone()
            conn.close()

            if row:
                result = json.loads(row[0])
                result["cache_hit"] = True
                return result
            return None
        except Exception as e:
            logger.warning(f"Cache read error for {mpn}/{manufacturer}: {e}")
            return None

    def set_cached(self, mpn: str, manufacturer: str, result: Dict[str, Any]):
        """Store an enrichment result in the cache."""
        try:
            # Don't cache error / not-found results
            if not result.get("found", False):
                return

            # Strip cache_hit flag before storing
            store_result = {k: v for k, v in result.items() if k != "cache_hit"}

            conn = sqlite3.connect(self.db_path)
            conn.execute(
                """INSERT OR REPLACE INTO enrichment_results (mpn, manufacturer, result_json, created_at)
                   VALUES (?, ?, ?, ?)""",
                (
                    self._normalize_key(mpn),
                    self._normalize_key(manufacturer),
                    json.dumps(store_result, default=str),
                    datetime.now(timezone.utc).isoformat()
                )
            )
            conn.commit()
            conn.close()
        except Exception as e:
            logger.warning(f"Cache write error for {mpn}/{manufacturer}: {e}")

    def clear_cache(self):
        """Wipe all cached entries."""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.execute("DELETE FROM enrichment_results")
            conn.commit()
            conn.close()
            logger.info("Enrichment cache cleared.")
        except Exception as e:
            logger.warning(f"Cache clear error: {e}")

    def cache_size(self) -> int:
        """Return the number of cached entries."""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.execute("SELECT COUNT(*) FROM enrichment_results")
            count = cursor.fetchone()[0]
            conn.close()
            return count
        except Exception:
            return 0


# Module-level singleton
enrichment_cache = EnrichmentCache()
