import os
import re
import logging
from typing import Dict, Any, List
from rapidfuzz import fuzz
from app.database.repository import repository
from app.pipeline.delivery_formatter import delivery_generator
from app.services.evaluation.ground_truth_loader import load_official_ground_truth
from app.services.matching.brand_matching import MASTER_MANUFACTURERS, MASTER_BRANDS
from app.validators.lov_validator import lov_validator

logger = logging.getLogger("app.evaluation")

def normalize_value(val: Any) -> str:
    if val is None:
        return ""
    v = str(val).strip()
    if v.lower() in ["nan", "none", "n/a", "null"]:
        return ""
    return v

def normalize_text(val: Any) -> str:
    v = normalize_value(val)
    v = re.sub(r'\s+', ' ', v)
    return v.lower()

class ComprehensiveEvaluationService:
    """
    Evaluates system predictions against official ground truth dataset.
    Calculates separate metrics for LOV compliance vs. Ground Truth Accuracy,
    semantic attribute matching, 252-column comparisons, and description similarity.
    """
    def evaluate(self) -> Dict[str, Any]:
        gt_source_path, input_rows, delivery_rows, gt_map = load_official_ground_truth()
        products = repository.get_all_products()

        gt_count = len(gt_map)
        if gt_count == 0:
            return {
                "status": "error",
                "message": "No ground truth file found.",
                "gt_source_path": gt_source_path,
                "total_ground_truth_rows": 0,
                "evaluated_rows": 0,
                "overall_field_exact_match_pct": 0.0,
                "non_empty_gt_field_match_pct": 0.0,
                "prediction_completeness": 0.0,
                "ground_truth_completeness": 0.0,
                "row_completeness": 0.0,
                "manufacturer_accuracy": 0.0,
                "brand_accuracy": 0.0,
                "department_accuracy": 0.0,
                "class_accuracy": 0.0,
                "fine_category_accuracy": 0.0,
                "attribute_accuracy": 0.0,
                "lov_compliance": 0.0,
                "uom_compliance": 0.0,
                "desc_character_compliance": 0.0
            }

        matched_pairs = []
        for p in products:
            part = str(p.get("mfg_part_num", "")).strip()
            if part in gt_map:
                matched_pairs.append((p, gt_map[part]))

        evaluated_rows = len(matched_pairs)

        if evaluated_rows == 0:
            return {
                "status": "no_predictions",
                "message": f"Ground truth loaded from {os.path.basename(gt_source_path)} ({gt_count} rows), but 0 ingested products match ground truth Mfg_Part_Num.",
                "gt_source_path": gt_source_path,
                "total_ground_truth_rows": gt_count,
                "evaluated_rows": 0,
                "overall_field_exact_match_pct": 0.0,
                "non_empty_gt_field_match_pct": 0.0,
                "prediction_completeness": 0.0,
                "ground_truth_completeness": 0.0,
                "row_completeness": 0.0,
                "manufacturer_accuracy": 0.0,
                "brand_accuracy": 0.0,
                "department_accuracy": 0.0,
                "class_accuracy": 0.0,
                "fine_category_accuracy": 0.0,
                "attribute_accuracy": 0.0,
                "lov_compliance": 0.0,
                "uom_compliance": 0.0,
                "desc_character_compliance": 0.0
            }

        total_comparisons = 0
        total_exact_matches = 0
        total_norm_matches = 0
        total_mismatches = 0
        total_missing_predictions = 0
        total_missing_gt = 0

        total_non_empty_gt_fields = 0
        non_empty_gt_matches = 0
        total_non_empty_predicted_fields = 0

        field_stats: Dict[str, Dict[str, int]] = {h: {"matches": 0, "mismatches": 0, "non_empty_gt": 0} for h in delivery_generator.headers}

        mfg_exact_count = 0
        mfg_norm_count = 0
        mfg_fuzzy_count = 0
        mfg_master_valid_count = 0

        brand_exact_count = 0
        brand_norm_count = 0
        brand_fuzzy_count = 0
        brand_master_valid_count = 0

        dept_exact_count = 0
        class_exact_count = 0
        fine_exact_count = 0
        classpath_exact_count = 0

        attr_name_matches = 0
        attr_val_matches = 0
        attr_uom_matches = 0
        attr_complete_matches = 0
        total_gt_attrs_count = 0

        lov_compliance_pass = 0
        total_lov_checks = 0

        uom_compliance_pass = 0
        total_uom_checks = 0

        desc_char_compliance_pass = 0
        desc_exact_gt_matches = 0
        desc_similarity_sum = 0.0
        total_desc_checks = 0

        for prod, gt in matched_pairs:
            gen = delivery_generator.format_product(prod)

            pred_mfg = gen.get("MANUFACTURER_NAME", "")
            gt_mfg = gt.get("MANUFACTURER_NAME", "")
            if pred_mfg == gt_mfg and pred_mfg != "":
                mfg_exact_count += 1
            if normalize_text(pred_mfg) == normalize_text(gt_mfg) and pred_mfg != "":
                mfg_norm_count += 1
            if fuzz.token_set_ratio(normalize_text(pred_mfg), normalize_text(gt_mfg)) >= 85 and pred_mfg != "":
                mfg_fuzzy_count += 1
            if pred_mfg in MASTER_MANUFACTURERS or normalize_text(pred_mfg) in [m.lower() for m in MASTER_MANUFACTURERS]:
                mfg_master_valid_count += 1

            pred_brand = gen.get("BRAND_NAME", "")
            gt_brand = gt.get("BRAND_NAME", "")
            if pred_brand == gt_brand and pred_brand != "":
                brand_exact_count += 1
            if normalize_text(pred_brand) == normalize_text(gt_brand) and pred_brand != "":
                brand_norm_count += 1
            if fuzz.token_set_ratio(normalize_text(pred_brand), normalize_text(gt_brand)) >= 85 and pred_brand != "":
                brand_fuzzy_count += 1
            if pred_brand in MASTER_BRANDS or normalize_text(pred_brand) in [b.lower() for b in MASTER_BRANDS]:
                brand_master_valid_count += 1

            if normalize_text(gen.get("Dept")) == normalize_text(gt.get("Dept")):
                dept_exact_count += 1
            if normalize_text(gen.get("Class")) == normalize_text(gt.get("Class")):
                class_exact_count += 1
            if normalize_text(gen.get("Fine")) == normalize_text(gt.get("Fine")):
                fine_exact_count += 1
            if normalize_text(gen.get("Classpath")) == normalize_text(gt.get("Classpath")):
                classpath_exact_count += 1

            for h in delivery_generator.headers:
                total_comparisons += 1
                p_val = normalize_value(gen.get(h))
                g_val = normalize_value(gt.get(h))

                if p_val:
                    total_non_empty_predicted_fields += 1

                if g_val:
                    total_non_empty_gt_fields += 1
                    field_stats[h]["non_empty_gt"] += 1

                if not p_val and not g_val:
                    total_exact_matches += 1
                    field_stats[h]["matches"] += 1
                elif p_val and not g_val:
                    total_missing_gt += 1
                    total_mismatches += 1
                    field_stats[h]["mismatches"] += 1
                elif not p_val and g_val:
                    total_missing_predictions += 1
                    total_mismatches += 1
                    field_stats[h]["mismatches"] += 1
                elif p_val == g_val:
                    total_exact_matches += 1
                    field_stats[h]["matches"] += 1
                    if g_val:
                        non_empty_gt_matches += 1
                elif normalize_text(p_val) == normalize_text(g_val):
                    total_norm_matches += 1
                    total_exact_matches += 1
                    field_stats[h]["matches"] += 1
                    if g_val:
                        non_empty_gt_matches += 1
                else:
                    total_mismatches += 1
                    field_stats[h]["mismatches"] += 1

            gt_attrs = {}
            for i in range(1, 51):
                lbl = normalize_text(gt.get(f"ATTRIBUTE_LABEL {i}"))
                if lbl:
                    gt_attrs[lbl] = {
                        "value": normalize_text(gt.get(f"ATTRIBUTE_VALUE {i}")),
                        "uom": normalize_text(gt.get(f"ATTRIBUTE_UOM {i}"))
                    }

            pred_attrs = {}
            for attr in prod.get("attributes", []):
                lbl = normalize_text(attr.get("name"))
                if lbl:
                    pred_attrs[lbl] = {
                        "value": normalize_text(attr.get("value")),
                        "uom": normalize_text(attr.get("uom"))
                    }

            for lbl, g_attr in gt_attrs.items():
                total_gt_attrs_count += 1
                if lbl in pred_attrs:
                    attr_name_matches += 1
                    p_attr = pred_attrs[lbl]
                    v_match = (p_attr["value"] == g_attr["value"])
                    u_match = (p_attr["uom"] == g_attr["uom"])

                    if v_match:
                        attr_val_matches += 1
                    if u_match:
                        attr_uom_matches += 1
                    if v_match and u_match:
                        attr_complete_matches += 1

            for attr in prod.get("attributes", []):
                total_lov_checks += 1
                if attr.get("validation_status") == "PASS":
                    lov_compliance_pass += 1

                if attr.get("uom"):
                    total_uom_checks += 1
                    if lov_validator.is_valid_uom(attr.get("uom")):
                        uom_compliance_pass += 1

            descs = prod.get("descriptions", {})
            for d_type, p_desc in descs.items():
                if d_type in gt and gt.get(d_type):
                    total_desc_checks += 1
                    g_desc = gt.get(d_type)
                    p_str = normalize_value(p_desc)
                    g_str = normalize_value(g_desc)

                    if p_str == g_str:
                        desc_exact_gt_matches += 1

                    sim = fuzz.token_set_ratio(p_str, g_str)
                    desc_similarity_sum += sim

                    if d_type == "INVOICE_DESC" and len(p_str) <= 40:
                        desc_char_compliance_pass += 1
                    elif d_type == "MOBILE_DESC" and len(p_str) <= 80:
                        desc_char_compliance_pass += 1
                    elif len(p_str) <= 500:
                        desc_char_compliance_pass += 1

        all_field_exact_match_pct = round((total_exact_matches / total_comparisons) * 100.0, 1) if total_comparisons > 0 else 0.0
        non_empty_gt_field_match_pct = round((non_empty_gt_matches / total_non_empty_gt_fields) * 100.0, 1) if total_non_empty_gt_fields > 0 else 0.0
        prediction_completeness = round((total_non_empty_predicted_fields / total_comparisons) * 100.0, 1) if total_comparisons > 0 else 0.0
        ground_truth_completeness = round((total_non_empty_gt_fields / total_comparisons) * 100.0, 1) if total_comparisons > 0 else 0.0
        
        row_completeness = round((non_empty_gt_matches / total_non_empty_gt_fields) * 100.0, 1) if total_non_empty_gt_fields > 0 else 0.0

        mfg_acc = round((mfg_norm_count / evaluated_rows) * 100.0, 1)
        brand_acc = round((brand_norm_count / evaluated_rows) * 100.0, 1)
        dept_acc = round((dept_exact_count / evaluated_rows) * 100.0, 1)
        class_acc = round((class_exact_count / evaluated_rows) * 100.0, 1)
        fine_acc = round((fine_exact_count / evaluated_rows) * 100.0, 1)

        attribute_acc = round((attr_complete_matches / total_gt_attrs_count) * 100.0, 1) if total_gt_attrs_count > 0 else 100.0
        lov_comp = round((lov_compliance_pass / total_lov_checks) * 100.0, 1) if total_lov_checks > 0 else 100.0
        uom_comp = round((uom_compliance_pass / total_uom_checks) * 100.0, 1) if total_uom_checks > 0 else 100.0
        desc_char_comp = round((desc_char_compliance_pass / total_desc_checks) * 100.0, 1) if total_desc_checks > 0 else 100.0

        sorted_fields = []
        for h, f_stat in field_stats.items():
            tot = f_stat["matches"] + f_stat["mismatches"]
            acc = round((f_stat["matches"] / tot) * 100.0, 1) if tot > 0 else 100.0
            sorted_fields.append({"field": h, "accuracy": acc, "matches": f_stat["matches"], "mismatches": f_stat["mismatches"]})

        top_20_accurate = sorted(sorted_fields, key=lambda x: x["accuracy"], reverse=True)[:20]
        top_20_inaccurate = sorted(sorted_fields, key=lambda x: (x["accuracy"], x["mismatches"]))[:20]

        return {
            "status": "success",
            "gt_source_path": gt_source_path,
            "total_ground_truth_rows": gt_count,
            "evaluated_rows": evaluated_rows,
            "all_field_exact_match_pct": all_field_exact_match_pct,
            "non_empty_gt_field_match_pct": non_empty_gt_field_match_pct,
            "prediction_completeness": prediction_completeness,
            "ground_truth_completeness": ground_truth_completeness,
            "row_completeness": row_completeness,
            "manufacturer_accuracy": mfg_acc,
            "brand_accuracy": brand_acc,
            "department_accuracy": dept_acc,
            "class_accuracy": class_acc,
            "fine_category_accuracy": fine_acc,
            "attribute_accuracy": attribute_acc,
            "lov_compliance": lov_comp,
            "uom_compliance": uom_comp,
            "desc_character_compliance": desc_char_comp,
            "manufacturer_metrics": {
                "exact_canonical_match_pct": round((mfg_exact_count / evaluated_rows) * 100.0, 1),
                "normalized_match_pct": mfg_acc,
                "fuzzy_match_pct": round((mfg_fuzzy_count / evaluated_rows) * 100.0, 1),
                "master_list_validity_pct": round((mfg_master_valid_count / evaluated_rows) * 100.0, 1)
            },
            "brand_metrics": {
                "exact_canonical_match_pct": round((brand_exact_count / evaluated_rows) * 100.0, 1),
                "normalized_match_pct": brand_acc,
                "fuzzy_match_pct": round((brand_fuzzy_count / evaluated_rows) * 100.0, 1),
                "master_list_validity_pct": round((brand_master_valid_count / evaluated_rows) * 100.0, 1)
            },
            "taxonomy_metrics": {
                "department_accuracy_pct": dept_acc,
                "class_accuracy_pct": class_acc,
                "fine_category_accuracy_pct": fine_acc,
                "classpath_accuracy_pct": round((classpath_exact_count / evaluated_rows) * 100.0, 1)
            },
            "attribute_metrics": {
                "name_match_pct": round((attr_name_matches / total_gt_attrs_count) * 100.0, 1) if total_gt_attrs_count > 0 else 100.0,
                "value_exact_match_pct": round((attr_val_matches / total_gt_attrs_count) * 100.0, 1) if total_gt_attrs_count > 0 else 100.0,
                "uom_match_pct": round((attr_uom_matches / total_gt_attrs_count) * 100.0, 1) if total_gt_attrs_count > 0 else 100.0,
                "complete_attribute_match_pct": attribute_acc
            },
            "description_metrics": {
                "character_compliance_pct": desc_char_comp,
                "exact_gt_match_pct": round((desc_exact_gt_matches / total_desc_checks) * 100.0, 1) if total_desc_checks > 0 else 0.0,
                "average_fuzzy_similarity": round((desc_similarity_sum / total_desc_checks), 1) if total_desc_checks > 0 else 0.0
            },
            "details": {
                "total_comparisons": total_comparisons,
                "exact_matches": total_exact_matches,
                "normalized_matches": total_norm_matches,
                "mismatches": total_mismatches,
                "missing_predictions": total_missing_predictions,
                "missing_ground_truth": total_missing_gt
            },
            "top_20_accurate_fields": top_20_accurate,
            "top_20_inaccurate_fields": top_20_inaccurate
        }

evaluation_service = ComprehensiveEvaluationService()
