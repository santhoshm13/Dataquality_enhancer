import sys
import os
import asyncio
import json

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.evaluation.evaluation_service import evaluation_service

def main():
    print("Running Full Ground-Truth Evaluation Pipeline...")
    results = evaluation_service.evaluate()
    
    if results.get("status") != "success":
        print(f"Evaluation Failed: {results.get('message')}")
        sys.exit(1)
        
    print(f"Successfully evaluated {results['evaluated_rows']} out of {results['total_ground_truth_rows']} ground truth rows.")
    print("-" * 50)
    print(f"Overall Exact Field Match (252-cols): {results['overall_field_exact_match_pct']}%")
    print(f"Manufacturer Accuracy:                {results['manufacturer_accuracy']}%")
    print(f"Brand Accuracy:                       {results['brand_accuracy']}%")
    print(f"Taxonomy (Dept/Class/Fine) Accuracy:  {results['department_accuracy']}% / {results['class_accuracy']}% / {results['fine_category_accuracy']}%")
    print(f"LOV Compliance Pass Rate:             {results['lov_compliance']}%")
    print(f"UOM Compliance Pass Rate:             {results['uom_compliance']}%")
    print(f"Description Character Compliance:     {results['desc_character_compliance']}%")
    print(f"Attribute Accuracy (Semantic):        {results['attribute_accuracy']}%")
    print("-" * 50)
    print("Top 5 Accurate Fields:")
    for f in results["top_20_accurate_fields"][:5]:
        print(f"  - {f['field']}: {f['accuracy']}%")
    print("Top 5 Inaccurate Fields:")
    for f in results["top_20_inaccurate_fields"][:5]:
        print(f"  - {f['field']}: {f['accuracy']}%")
    print("-" * 50)
    
    # Save detailed breakdown to JSON file
    out_file = "evaluation_report.json"
    with open(out_file, "w") as f:
        json.dump(results, f, indent=2)
    print(f"Detailed evaluation report saved to {out_file}")

if __name__ == "__main__":
    main()
