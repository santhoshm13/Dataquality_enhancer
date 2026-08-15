import logging
from typing import Optional
from app.database.master_data_repository import master_repository

logger = logging.getLogger("app.services.fraction")

# Fallback 63 inch exact fraction conversions table
DEFAULT_DECIMAL_TO_FRACTION = {
    "0.5": "1/2",
    "0.25": "1/4",
    "0.75": "3/4",
    "0.125": "1/8",
    "0.375": "3/8",
    "0.625": "5/8",
    "0.875": "7/8",
    "0.0625": "1/16",
    "0.1875": "3/16",
    "0.3125": "5/16",
    "0.4375": "7/16",
    "0.5625": "9/16",
    "0.6875": "11/16",
    "0.8125": "13/16",
    "0.9375": "15/16"
}

class FractionService:
    def decimal_to_fraction(self, decimal_val: str) -> Optional[str]:
        """
        Converts a decimal string or float value to standard inch fraction representation.
        Uses master_repository.decimal_fractions if populated, else DEFAULT_DECIMAL_TO_FRACTION.
        """
        if not decimal_val:
            return None

        clean_dec = str(decimal_val).strip()

        # 1. Query master_repository
        repo_fraction = master_repository.get_fraction(clean_dec)
        if repo_fraction:
            return repo_fraction

        # 2. Query fallback dictionary
        if clean_dec in DEFAULT_DECIMAL_TO_FRACTION:
            return DEFAULT_DECIMAL_TO_FRACTION[clean_dec]

        # Try float parsing for loose string formats e.g. "0.50" -> "1/2"
        try:
            f_val = float(clean_dec)
            for k, v in DEFAULT_DECIMAL_TO_FRACTION.items():
                if abs(float(k) - f_val) < 1e-4:
                    return v
        except ValueError:
            pass

        return None

fraction_service = FractionService()
