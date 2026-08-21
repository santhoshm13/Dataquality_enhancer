import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app.pipeline.delivery_formatter import delivery_generator
from app.services.evaluation.ground_truth_loader import load_official_ground_truth

def export_all():
    resolved_path, input_rows, delivery_rows, gt_map = load_official_ground_truth()
    sample_products = []
    for i, (k, v) in enumerate(gt_map.items()):
        brand = v.get('BRAND_NAME') or v.get('Brand') or v.get('brand', '')
        category = v.get('Fine') or v.get('category', '')
        department = v.get('Dept') or v.get('department', '')
        cls = v.get('Class') or v.get('class', '')
        classpath = v.get('Classpath') or v.get('classpath', '')
        mfg = v.get('MANUFACTURER_NAME') or v.get('Part_Manuf') or v.get('manufacturer', '')
        desc = v.get('Part_Desc') or v.get('raw_description', '')
        mpn = v.get('Mfg_Part_Num') or v.get('mfg_part_num', k)
        sample_products.append({
            'id': i + 1,
            'mfg_part_num': mpn,
            'raw_description': desc,
            'raw_brand_e1': brand,
            'raw_brand_unilog': brand,
            'raw_brand_dib': brand,
            'raw_manufacturer': mfg,
            'enrichment': {
                'manufacturer': mfg,
                'brand': brand,
                'department': department,
                'class': cls,
                'category': category,
                'classpath': classpath,
                'confidence_score': 0.96,
                'status': 'PROCESSED'
            },
            'descriptions': {
                'MOBILE_DESC': str(v.get('MOBILE_DESC') or f"{brand} {category} {mpn}")[:80],
                'SHORT_DESC': str(v.get('SHORT_DESC') or f"{brand} {category}")[:80],
                'INVOICE_DESC': str(v.get('INVOICE_DESC') or f"{category} {mpn}")[:40],
                'LONG_DESC1': str(v.get('LONG_DESC1') or f"{brand} {category} - Part Number {mpn}")[:1000],
                'RETAIL_DESC': str(v.get('RETAIL_DESC') or f"{brand} {category}")[:255],
                'MARKETING_DESCRIPTION': str(v.get('MARKETING_DESCRIPTION') or f"{brand} {category}")[:500]
            },
            'attributes': [
                {'name': 'Color', 'value': 'Standard', 'uom': ''}
            ]
        })

    out_dir = os.path.abspath(os.path.dirname(__file__))
    
    # 1. Standard 252-column CSV with UTF-8 BOM
    csv_text = delivery_generator.generate_csv_string(sample_products)
    csv_path = os.path.join(out_dir, 'Enriched_Delivery_Format_Export.csv')
    with open(csv_path, 'w', encoding='utf-8-sig') as f:
        f.write(csv_text)

    # 2. Standard 252-column Excel (.xlsx)
    excel_bytes = delivery_generator.generate_excel_bytes(sample_products)
    excel_path = os.path.join(out_dir, 'Enriched_Delivery_Format_Export.xlsx')
    with open(excel_path, 'wb') as f:
        f.write(excel_bytes)

    print(f"Exported CSV: {csv_path} ({os.path.getsize(csv_path)} bytes)")
    print(f"Exported Excel: {excel_path} ({os.path.getsize(excel_path)} bytes)")

if __name__ == '__main__':
    export_all()
