import logging
from typing import Optional
from scripts.db_helper import get_engine
from sqlalchemy.orm import sessionmaker
from app.database.models import MasterDecimalFraction

logger = logging.getLogger("app.services.fraction")

class FractionService:
    def __init__(self):
        self._fractions_map = {}
        self._fractions_list = []
        self._loaded = False

    def load_fractions(self):
        if self._loaded:
            return
        
        try:
            engine = get_engine()
            Session = sessionmaker(bind=engine)
            session = Session()
            db_rows = session.query(MasterDecimalFraction).all()
            
            for r in db_rows:
                self._fractions_map[round(r.decimal_value, 4)] = r.fraction_string
                self._fractions_list.append((r.decimal_value, r.fraction_string))
            
            for i in range(1, 64):
                val = i / 64.0
                round_val = round(val, 4)
                if round_val not in self._fractions_map:
                    self._fractions_list.append((val, f"{i}/64"))

            self._fractions_list.sort(key=lambda x: x[0])
            session.close()
            self._loaded = True
        except Exception as e:
            logger.warning(f"Could not load decimal fractions from DB: {e}")
            # Fallback
            DEFAULT_DECIMAL_TO_FRACTION = {
                "0.5": "1/2", "0.25": "1/4", "0.75": "3/4",
                "0.125": "1/8", "0.375": "3/8", "0.625": "5/8", "0.875": "7/8",
                "0.0625": "1/16", "0.1875": "3/16", "0.3125": "5/16", "0.4375": "7/16",
                "0.5625": "9/16", "0.6875": "11/16", "0.8125": "13/16", "0.9375": "15/16"
            }
            for k, v in DEFAULT_DECIMAL_TO_FRACTION.items():
                self._fractions_map[float(k)] = v
                self._fractions_list.append((float(k), v))
                
            for i in range(1, 64):
                val = i / 64.0
                if val not in self._fractions_map:
                    self._fractions_list.append((val, f"{i}/64"))
            
            self._fractions_list.sort(key=lambda x: x[0])
            self._loaded = True

    def decimal_to_fraction(self, decimal_val: str) -> Optional[str]:
        """
        Converts a decimal string or float value to standard inch fraction representation.
        Handles whole numbers + fractional remainders (e.g., 50.25 -> 50-1/4).
        Rounds to nearest 1/64 fraction.
        """
        if not decimal_val:
            return None

        clean_dec = str(decimal_val).strip()
        try:
            f_val = float(clean_dec)
        except ValueError:
            return None # Not a number
            
        self.load_fractions()
        
        whole = int(f_val)
        remainder = abs(f_val - whole)
        
        if remainder < 1e-4:
            return str(whole)
            
        best_frac = None
        min_diff = float('inf')
        
        for d_val, f_str in self._fractions_list:
            diff = abs(remainder - d_val)
            if diff < min_diff:
                min_diff = diff
                best_frac = f_str
                
        if best_frac:
            # Reconstruct string
            if whole == 0:
                return best_frac
            else:
                return f"{whole}-{best_frac}"
                
        return None

fraction_service = FractionService()
