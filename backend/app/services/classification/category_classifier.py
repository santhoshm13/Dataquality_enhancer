from typing import Dict, Any

TAXONOMY_MAP = {
    "dishwasher": {
        "department": "Appliances",
        "class": "Large Appliances",
        "category": "Built-In Dishwashers",
        "classpath": "Appliances & Consumer Electronics>Kitchen Appliances>Built-In Dishwashers"
    },
    "sanding belt": {
        "department": "Abrasives",
        "class": "Coated Abrasives",
        "category": "Sanding Belts",
        "classpath": "Industrial Supplies>Abrasives>Coated Abrasives>Sanding Belts"
    },
    "disc": {
        "department": "Abrasives",
        "class": "Coated Abrasives",
        "category": "Sanding Discs",
        "classpath": "Industrial Supplies>Abrasives>Coated Abrasives>Sanding Discs"
    }
}

class CategoryClassifierService:
    def classify(self, product_desc: str, mfg_part_num: str = "", manufacturer: str = "") -> Dict[str, Any]:
        desc_lower = product_desc.lower()
        
        for key, tax in TAXONOMY_MAP.items():
            if key in desc_lower:
                return {
                    "department": tax["department"],
                    "class": tax["class"],
                    "category": tax["category"],
                    "classpath": tax["classpath"],
                    "confidence": 0.95
                }
                
        return {
            "department": "General Merchandise",
            "class": "Unclassified",
            "category": "General Industrial",
            "classpath": "General Industrial>Unclassified",
            "confidence": 0.50
        }

classifier = CategoryClassifierService()
