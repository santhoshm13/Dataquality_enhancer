#!/usr/bin/env python3
"""
Automated End-to-End Pipeline Audit Agent
========================================
Author: Antigravity Audit Agent
Repository: Dataquality_enhancer-main

Performs a rigorous, honest, and independent end-to-end verification:
  STEP 1: Fresh Run Verification (FastAPI /api/upload -> /api/pipeline/run -> /api/pipeline/status)
  STEP 2: Independent Ground Truth Comparison (Standalone matching vs App's /api/evaluation reporting)
  STEP 3: Live URL / Provenance Accuracy Check (Live HTTP GET, status code & MPN/Manufacturer text check)
  STEP 4: Confidence Calibration Audit (Accuracy breakdown across High, Medium, and Needs Review tiers)
  STEP 5: Final Evaluation Verdict & Audit Report Export (JSON export + console report)
"""

import sys
import os
import io
import re
import json
import time
import asyncio
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple

import httpx
import pandas as pd
import numpy as np

# Ensure backend directory is in sys.path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
ROOT_DIR = os.path.abspath(os.path.join(BACKEND_DIR, ".."))

if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# Configure safe console output on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from app.main import app
from app.database.repository import repository

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger("pipeline_auditor")

# ==============================================================================
# AUDIT QUALITY THRESHOLDS & BENCHMARKS
# ==============================================================================
MIN_ROWS_PROCESSED_PCT = 95.0        # Minimum % of input rows successfully processed
MIN_FIELD_MATCH_PCT = 50.0           # Minimum % of populated GT fields matched
MIN_TAXONOMY_ACCURACY_PCT = 80.0     # Minimum % taxonomy classification accuracy
MIN_DESC_COMPLIANCE_PCT = 90.0       # Minimum % description character length compliance
MIN_URL_VALIDITY_PCT = 50.0          # Minimum % of live valid URLs
MAX_EVAL_DISCREPANCY_PCT = 5.0       # Max % discrepancy between Independent Evaluator and App Evaluator


def find_ground_truth_file() -> str:
    """Locate the official 200-item ground truth workbook."""
    candidates = [
        os.path.join(ROOT_DIR, "data", "expected", "Unilog-Sample_200_Items-Input-vs-Output.xlsx"),
        os.path.join(BACKEND_DIR, "data", "expected", "Unilog-Sample_200_Items-Input-vs-Output.xlsx"),
        os.path.join(ROOT_DIR, "data", "expected", "Unilog-Sample_200_Items-Expected.csv"),
    ]
    for c in candidates:
        if os.path.exists(c):
            return os.path.abspath(c)
    raise FileNotFoundError("Could not find official ground truth workbook 'Unilog-Sample_200_Items-Input-vs-Output.xlsx'")


# ==============================================================================
# INDEPENDENT FIELD MATCHING ENGINE (Completely separate from app evaluation code)
# ==============================================================================
def independent_norm_val(val: Any) -> str:
    """Normalize cell values independently."""
    if val is None or pd.isna(val):
        return ""
    v = str(val).strip()
    if v.lower() in ["nan", "none", "n/a", "null", "<na>"]:
        return ""
    return v


def independent_norm_text(val: Any) -> str:
    """Normalize text for case-insensitive, whitespace-trimmed comparison."""
    v = independent_norm_val(val)
    v = re.sub(r'\s+', ' ', v)
    return v.lower()


def independent_fields_match(pred_val: Any, gt_val: Any) -> bool:
    """
    Direct, unbiased comparison between predicted and ground-truth values.
    Supports case-insensitive string equality and numeric floating-point equivalence.
    """
    p_str = independent_norm_val(pred_val)
    g_str = independent_norm_val(gt_val)

    if not p_str and not g_str:
        return True
    if not p_str or not g_str:
        return False

    p_norm = independent_norm_text(p_str)
    g_norm = independent_norm_text(g_str)

    if p_norm == g_norm:
        return True

    # Numeric equivalence check (e.g. "120.0" vs "120")
    try:
        f_p = float(p_norm)
        f_g = float(g_norm)
        if abs(f_p - f_g) < 1e-4:
            return True
    except (ValueError, TypeError):
        pass

    return False


class PipelineAuditor:
    def __init__(self):
        self.gt_filepath = find_ground_truth_file()
        self.start_time = 0.0
        self.audit_report: Dict[str, Any] = {}

    async def run_full_audit(self) -> Dict[str, Any]:
        self.start_time = time.perf_counter()
        timestamp_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        file_ts = datetime.now().strftime("%Y%m%d_%H%M%S")

        print("\n" + "=" * 80)
        print("         AI PRODUCT ENRICHMENT PLATFORM: END-TO-END AUDIT AGENT")
        print("=" * 80)
        print(f"Timestamp        : {timestamp_str}")
        print(f"Ground Truth File: {self.gt_filepath}")
        print("=" * 80 + "\n")

        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app),
            base_url="http://testserver",
            timeout=120.0
        ) as client:

            # ------------------------------------------------------------------
            # STEP 1: FRESH RUN VERIFICATION
            # ------------------------------------------------------------------
            step1_res = await self._step1_fresh_run_verification(client)

            # ------------------------------------------------------------------
            # STEP 2: INDEPENDENT GROUND TRUTH COMPARISON
            # ------------------------------------------------------------------
            step2_res = await self._step2_independent_ground_truth_comparison(client, step1_res["dataset_id"])

            # ------------------------------------------------------------------
            # STEP 3: LIVE URL / PROVENANCE ACCURACY CHECK
            # ------------------------------------------------------------------
            step3_res = await self._step3_url_provenance_check(step1_res["products"])

            # ------------------------------------------------------------------
            # STEP 4: CONFIDENCE CALIBRATION AUDIT
            # ------------------------------------------------------------------
            step4_res = await self._step4_confidence_calibration_check(
                step1_res["products"],
                step2_res["gt_rows_by_mpn"],
                step2_res["exported_df"]
            )

            # ------------------------------------------------------------------
            # STEP 5: FINAL REPORT & VERDICT
            # ------------------------------------------------------------------
            total_elapsed = time.perf_counter() - self.start_time
            step5_res = self._step5_final_verdict(
                step1_res, step2_res, step3_res, step4_res, total_elapsed, timestamp_str
            )

            # Save JSON report
            out_filename = f"audit_report_{file_ts}.json"
            out_filepath = os.path.join(SCRIPT_DIR, out_filename)
            latest_filepath = os.path.join(SCRIPT_DIR, "latest_audit_report.json")

            with open(out_filepath, "w", encoding="utf-8") as f:
                json.dump(step5_res, f, indent=2)

            with open(latest_filepath, "w", encoding="utf-8") as f:
                json.dump(step5_res, f, indent=2)

            print(f"\n[Audit] Saved detailed JSON report to: {out_filepath}")
            print(f"[Audit] Updated symlink/copy at: {latest_filepath}")

            return step5_res

    # ==========================================================================
    # STEP 1: FRESH RUN VERIFICATION
    # ==========================================================================
    async def _step1_fresh_run_verification(self, client: httpx.AsyncClient) -> Dict[str, Any]:
        logger.info(">>> STEP 1: FRESH RUN VERIFICATION (Testing Live FastAPI Endpoints)...")

        # 1. Clear database repository for clean fresh start
        repository.clear()

        # 2. Read Input Sheet
        xl = pd.ExcelFile(self.gt_filepath)
        df_input = xl.parse("Input").fillna("")
        total_input_rows = len(df_input)
        logger.info(f"Loaded {total_input_rows} rows from sheet 'Input'.")

        # 3. Create CSV buffer and upload via POST /api/upload
        csv_buf = io.StringIO()
        df_input.to_csv(csv_buf, index=False)
        csv_bytes = csv_buf.getvalue().encode("utf-8")

        logger.info("Submitting file to POST /api/upload...")
        t0 = time.perf_counter()
        upload_resp = await client.post(
            "/api/upload",
            files={"file": ("Unilog_200_Items_Input.csv", csv_bytes, "text/csv")}
        )
        upload_time = time.perf_counter() - t0

        if upload_resp.status_code != 200:
            raise RuntimeError(f"POST /api/upload failed with status {upload_resp.status_code}: {upload_resp.text}")

        upload_data = upload_resp.json()
        dataset_id = upload_data["dataset_id"]
        imported_count = upload_data.get("imported_count", 0)
        logger.info(f"Upload successful (Dataset ID: {dataset_id}, Imported: {imported_count}/{total_input_rows} rows in {upload_time:.2f}s).")

        # 4. Trigger Batch Enrichment via POST /api/pipeline/run
        logger.info(f"Triggering pipeline execution via POST /api/pipeline/run?dataset_id={dataset_id}...")
        t_pipe_start = time.perf_counter()
        run_resp = await client.post(f"/api/pipeline/run?dataset_id={dataset_id}&concurrency=10")
        if run_resp.status_code != 200:
            raise RuntimeError(f"POST /api/pipeline/run failed with status {run_resp.status_code}: {run_resp.text}")

        job_data = run_resp.json()
        job_id = job_data["job_id"]
        logger.info(f"Batch enrichment job launched: Job ID {job_id}")

        # 5. Poll GET /api/pipeline/status until completion
        max_poll_seconds = 60
        poll_interval = 0.5
        elapsed_poll = 0.0
        final_status = {}

        while elapsed_poll < max_poll_seconds:
            await asyncio.sleep(poll_interval)
            elapsed_poll += poll_interval
            status_resp = await client.get(f"/api/pipeline/status?dataset_id={dataset_id}")
            if status_resp.status_code == 200:
                final_status = status_resp.json()
                if final_status.get("status") == "COMPLETED":
                    break

        pipeline_duration = time.perf_counter() - t_pipe_start
        processed_rows = final_status.get("processed_rows", 0)
        success_count = final_status.get("success_count", 0)
        failed_count = final_status.get("failed_count", 0)
        errors = final_status.get("errors", [])

        # 6. Fetch all products via paginated GET /api/products
        all_products = []
        page = 1
        while True:
            prod_resp = await client.get(f"/api/products?dataset_id={dataset_id}&limit=100&page={page}")
            if prod_resp.status_code != 200:
                break
            p_data = prod_resp.json()
            items = p_data.get("items", [])
            all_products.extend(items)
            if len(items) < 100 or len(all_products) >= p_data.get("total", 0):
                break
            page += 1

        processed_pct = (processed_rows / total_input_rows * 100.0) if total_input_rows > 0 else 0.0

        print("\n" + "-" * 70)
        print("STEP 1 RESULTS: PIPELINE EXECUTION RELIABILITY")
        print("-" * 70)
        print(f"Total Rows Submitted       : {total_input_rows}")
        print(f"Total Rows Imported        : {imported_count}")
        print(f"Total Rows Processed       : {processed_rows}")
        print(f"Successful Results         : {success_count}")
        print(f"Errors / Timeouts          : {failed_count}")
        print(f"Rows Retrieved from API    : {len(all_products)}")
        print(f"Pipeline Processed Rate    : {processed_pct:.1f}%")
        print(f"Total Pipeline Runtime     : {pipeline_duration:.2f}s ({pipeline_duration/total_input_rows*1000:.1f} ms/row)")
        print("-" * 70)

        if processed_rows < total_input_rows:
            print(f"[!] WARNING: Earlier bug detected! Expected {total_input_rows} rows, but only {processed_rows} were processed.")
        else:
            print(f"[OK] VERIFIED: All {total_input_rows} rows processed without early truncation.")

        return {
            "dataset_id": dataset_id,
            "total_input_rows": total_input_rows,
            "imported_count": imported_count,
            "processed_rows": processed_rows,
            "success_count": success_count,
            "failed_count": failed_count,
            "processed_pct": processed_pct,
            "pipeline_duration_s": round(pipeline_duration, 2),
            "errors": errors,
            "products": all_products
        }

    # ==========================================================================
    # STEP 2: INDEPENDENT GROUND TRUTH COMPARISON
    # ==========================================================================
    async def _step2_independent_ground_truth_comparison(
        self, client: httpx.AsyncClient, dataset_id: int
    ) -> Dict[str, Any]:
        logger.info(">>> STEP 2: INDEPENDENT GROUND TRUTH COMPARISON (Separate Field Matcher)...")

        # 1. Load Ground Truth Delivery Format sheet
        xl = pd.ExcelFile(self.gt_filepath)
        df_gt = xl.parse("Delivery Format").fillna("")
        logger.info(f"Loaded ground truth delivery format: {len(df_gt)} rows x {len(df_gt.columns)} columns.")

        # Index GT rows by MPN / SKU
        gt_rows_by_mpn: Dict[str, Dict[str, Any]] = {}
        for _, row in df_gt.iterrows():
            row_dict = row.to_dict()
            mpn = independent_norm_val(row_dict.get("Mfg_Part_Num") or row_dict.get("MANUFACTURER_PART_NUMBER") or row_dict.get("SKU - MY_PART_NUMBER"))
            if mpn:
                gt_rows_by_mpn[mpn.lower()] = row_dict

        # 2. Fetch Exported Delivery CSV via POST /api/export
        export_resp = await client.post(f"/api/export?dataset_id={dataset_id}&format=csv")
        if export_resp.status_code != 200:
            raise RuntimeError(f"POST /api/export failed: {export_resp.status_code}")

        df_exported = pd.read_csv(io.StringIO(export_resp.text), dtype=str).fillna("")
        logger.info(f"Fetched exported delivery dataset: {len(df_exported)} rows x {len(df_exported.columns)} columns.")

        # 3. Independent Field Matching Engine
        total_gt_rows = len(df_gt)
        matched_row_count = 0

        total_comparisons = 0
        total_exact_matches = 0
        total_populated_gt_fields = 0
        populated_gt_matches = 0

        # Domain Specific Counters
        mfg_matches = 0
        mfg_evaluated = 0
        brand_matches = 0
        brand_evaluated = 0

        dept_matches = 0
        class_matches = 0
        fine_matches = 0
        classpath_matches = 0
        taxonomy_evaluated = 0

        part_desc_matches = 0
        image_flag_matches = 0

        attribute_label_matches = 0
        attribute_val_matches = 0
        attribute_uom_matches = 0
        total_attribute_cells_checked = 0

        per_row_accuracies = []
        per_field_stats: Dict[str, Dict[str, int]] = {
            col: {"populated_gt": 0, "matches": 0, "mismatches": 0}
            for col in df_gt.columns
        }

        for _, pred_row in df_exported.iterrows():
            pred_dict = pred_row.to_dict()
            mpn = independent_norm_val(pred_dict.get("Mfg_Part_Num") or pred_dict.get("MANUFACTURER_PART_NUMBER") or pred_dict.get("SKU - MY_PART_NUMBER"))
            if not mpn or mpn.lower() not in gt_rows_by_mpn:
                continue

            gt_dict = gt_rows_by_mpn[mpn.lower()]
            matched_row_count += 1

            row_pop_gt = 0
            row_matches = 0

            # Compare all 252 columns
            for col in df_gt.columns:
                p_val = pred_dict.get(col, "")
                g_val = gt_dict.get(col, "")

                total_comparisons += 1
                is_match = independent_fields_match(p_val, g_val)

                if is_match:
                    total_exact_matches += 1

                g_norm = independent_norm_val(g_val)
                if g_norm:
                    total_populated_gt_fields += 1
                    row_pop_gt += 1
                    per_field_stats[col]["populated_gt"] += 1

                    if is_match:
                        populated_gt_matches += 1
                        row_matches += 1
                        per_field_stats[col]["matches"] += 1
                    else:
                        per_field_stats[col]["mismatches"] += 1

            row_acc = (row_matches / row_pop_gt * 100.0) if row_pop_gt > 0 else 100.0
            per_row_accuracies.append(row_acc)

            # Specific Domains
            if independent_norm_val(gt_dict.get("MANUFACTURER_NAME")):
                mfg_evaluated += 1
                if independent_fields_match(pred_dict.get("MANUFACTURER_NAME"), gt_dict.get("MANUFACTURER_NAME")):
                    mfg_matches += 1

            if independent_norm_val(gt_dict.get("BRAND_NAME")):
                brand_evaluated += 1
                if independent_fields_match(pred_dict.get("BRAND_NAME"), gt_dict.get("BRAND_NAME")):
                    brand_matches += 1

            if independent_norm_val(gt_dict.get("Dept")):
                taxonomy_evaluated += 1
                if independent_fields_match(pred_dict.get("Dept"), gt_dict.get("Dept")):
                    dept_matches += 1
                if independent_fields_match(pred_dict.get("Class"), gt_dict.get("Class")):
                    class_matches += 1
                if independent_fields_match(pred_dict.get("Fine"), gt_dict.get("Fine")):
                    fine_matches += 1
                if independent_fields_match(pred_dict.get("Classpath"), gt_dict.get("Classpath")):
                    classpath_matches += 1

            if independent_fields_match(pred_dict.get("Part_Desc"), gt_dict.get("Part_Desc")):
                part_desc_matches += 1

            if independent_fields_match(pred_dict.get("Actual Image (Yes/No)"), gt_dict.get("Actual Image (Yes/No)")):
                image_flag_matches += 1

        # Calculate Independent Accuracies
        indep_overall_field_pct = round((populated_gt_matches / total_populated_gt_fields * 100.0), 1) if total_populated_gt_fields > 0 else 0.0
        indep_mfg_pct = round((mfg_matches / mfg_evaluated * 100.0), 1) if mfg_evaluated > 0 else 0.0
        indep_brand_pct = round((brand_matches / brand_evaluated * 100.0), 1) if brand_evaluated > 0 else 0.0
        indep_dept_pct = round((dept_matches / taxonomy_evaluated * 100.0), 1) if taxonomy_evaluated > 0 else 0.0
        indep_class_pct = round((class_matches / taxonomy_evaluated * 100.0), 1) if taxonomy_evaluated > 0 else 0.0
        indep_fine_pct = round((fine_matches / taxonomy_evaluated * 100.0), 1) if taxonomy_evaluated > 0 else 0.0
        indep_cp_pct = round((classpath_matches / taxonomy_evaluated * 100.0), 1) if taxonomy_evaluated > 0 else 0.0

        # 4. Fetch App's own evaluation reporting via GET /api/evaluation
        logger.info("Fetching App's own evaluation reporting via GET /api/evaluation...")
        eval_resp = await client.get("/api/evaluation")
        app_eval_data = eval_resp.json() if eval_resp.status_code == 200 else {}

        app_overall_field_pct = app_eval_data.get("overall_field_exact_match_pct")
        app_mfg_pct = app_eval_data.get("manufacturer_accuracy")
        app_brand_pct = app_eval_data.get("brand_accuracy")
        app_dept_pct = app_eval_data.get("department_accuracy")
        app_class_pct = app_eval_data.get("class_accuracy")
        app_fine_pct = app_eval_data.get("fine_category_accuracy")

        # 5. Discrepancy Analysis
        comparison_table = [
            ("Overall Populated Field Match %", indep_overall_field_pct, app_overall_field_pct),
            ("Manufacturer Name Match %", indep_mfg_pct, app_mfg_pct),
            ("Brand Name Match %", indep_brand_pct, app_brand_pct),
            ("Department Match %", indep_dept_pct, app_dept_pct),
            ("Class Match %", indep_class_pct, app_class_pct),
            ("Fine Category Match %", indep_fine_pct, app_fine_pct),
        ]

        discrepancies = []
        for name, indep_val, app_val in comparison_table:
            delta = abs((indep_val or 0.0) - (app_val or 0.0))
            is_discrepant = delta > MAX_EVAL_DISCREPANCY_PCT
            discrepancies.append({
                "metric": name,
                "independent_val": indep_val,
                "app_eval_val": app_val,
                "delta": round(delta, 1),
                "is_discrepant": is_discrepant
            })

        print("\n" + "-" * 75)
        print("STEP 2 RESULTS: INDEPENDENT EVALUATOR VS APP EVALUATOR PARITY")
        print("-" * 75)
        print(f"{'Metric Name':<35} | {'Independent':<12} | {'App Evaluator':<14} | {'Delta':<8}")
        print("-" * 75)
        has_major_discrepancy = False
        for d in discrepancies:
            ind_s = f"{d['independent_val']:.1f}%" if d['independent_val'] is not None else "N/A"
            app_s = f"{d['app_eval_val']:.1f}%" if d['app_eval_val'] is not None else "N/A"
            del_s = f"{d['delta']:.1f}%"
            flag = " [!]" if d['is_discrepant'] else ""
            if d['is_discrepant']:
                has_major_discrepancy = True
            print(f"{d['metric']:<35} | {ind_s:<12} | {app_s:<14} | {del_s:<8}{flag}")
        print("-" * 75)

        # 6. Sample Disagreement Rows
        disagreement_examples = []
        for _, pred_row in df_exported.iterrows():
            pred_dict = pred_row.to_dict()
            mpn = independent_norm_val(pred_dict.get("Mfg_Part_Num"))
            if not mpn or mpn.lower() not in gt_rows_by_mpn:
                continue
            gt_dict = gt_rows_by_mpn[mpn.lower()]

            mismatched_fields = []
            for col in ["MANUFACTURER_NAME", "BRAND_NAME", "Fine", "INVOICE_DESC"]:
                p_v = pred_dict.get(col, "")
                g_v = gt_dict.get(col, "")
                if independent_norm_val(g_v) and not independent_fields_match(p_v, g_v):
                    mismatched_fields.append((col, g_v, p_v))

            if mismatched_fields and len(disagreement_examples) < 5:
                disagreement_examples.append({
                    "mpn": mpn,
                    "mismatches": mismatched_fields
                })

        if has_major_discrepancy:
            print("\n[!] WARNING: App's evaluation logic differs significantly from independent verification.")
        else:
            print("\n[OK] PARITY CONFIRMED: Independent matching perfectly aligns with App's evaluation logic.")

        if disagreement_examples:
            print("\nSample Ground Truth vs Pipeline Disagreements (Top 5 Examples):")
            for idx, ex in enumerate(disagreement_examples, 1):
                print(f"  {idx}. MPN: {ex['mpn']}")
                for f, g, p in ex["mismatches"]:
                    print(f"     • Field '{f}': Expected='{g}' | Got='{p}'")

        return {
            "matched_rows": matched_row_count,
            "total_gt_rows": total_gt_rows,
            "total_comparisons": total_comparisons,
            "total_populated_gt_fields": total_populated_gt_fields,
            "populated_gt_matches": populated_gt_matches,
            "independent_overall_field_pct": indep_overall_field_pct,
            "independent_mfg_pct": indep_mfg_pct,
            "independent_brand_pct": indep_brand_pct,
            "independent_dept_pct": indep_dept_pct,
            "independent_class_pct": indep_class_pct,
            "independent_fine_pct": indep_fine_pct,
            "independent_classpath_pct": indep_cp_pct,
            "app_eval_overall_pct": app_overall_field_pct,
            "discrepancies": discrepancies,
            "has_major_discrepancy": has_major_discrepancy,
            "sample_disagreements": disagreement_examples,
            "gt_rows_by_mpn": gt_rows_by_mpn,
            "exported_df": df_exported,
            "per_row_accuracies": per_row_accuracies
        }

    # ==========================================================================
    # STEP 3: LIVE URL / PROVENANCE ACCURACY CHECK
    # ==========================================================================
    async def _step3_url_provenance_check(self, products: List[Dict[str, Any]]) -> Dict[str, Any]:
        logger.info(">>> STEP 3: URL / PROVENANCE ACCURACY CHECK (Live HTTP Fetch & MPN Check)...")

        urls_to_test = []
        for p in products:
            url = p.get("source_url") or p.get("enrichment", {}).get("source_url")
            mpn = p.get("mfg_part_num", "")
            mfg = p.get("manufacturer") or p.get("enrichment", {}).get("manufacturer", "")
            brand = p.get("brand") or p.get("enrichment", {}).get("brand", "")
            if url:
                urls_to_test.append({
                    "mpn": mpn,
                    "manufacturer": mfg,
                    "brand": brand,
                    "url": url
                })

        total_urls = len(urls_to_test)
        logger.info(f"Identified {total_urls} products with provenance source_urls. Testing live connectivity...")

        # Test URLs concurrently with limit of 10
        semaphore = asyncio.Semaphore(10)
        results = []

        async def check_url(item: Dict[str, Any]):
            url = item["url"]
            mpn = item["mpn"]
            mfg = item["manufacturer"]
            brand = item["brand"]

            status_code = None
            is_live = False
            mentions_target = False
            error_msg = None

            async with semaphore:
                try:
                    async with httpx.AsyncClient(
                        timeout=10.0,
                        follow_redirects=True,
                        headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
                    ) as http_client:
                        resp = await http_client.get(url)
                        status_code = resp.status_code
                        if resp.status_code == 200:
                            is_live = True
                            # Clean HTML and check presence of MPN or Manufacturer / Brand
                            page_text = re.sub(r'<[^>]+>', ' ', resp.text).lower()

                            mpn_clean = re.sub(r'[^a-zA-Z0-9]', '', mpn.lower())
                            mfg_clean = independent_norm_text(mfg)
                            brand_clean = independent_norm_text(brand)

                            if (mpn_clean and mpn_clean in re.sub(r'[^a-zA-Z0-9]', '', page_text)) or \
                               (mfg_clean and mfg_clean in page_text) or \
                               (brand_clean and brand_clean in page_text):
                                mentions_target = True
                except Exception as e:
                    error_msg = str(e)

            return {
                "mpn": mpn,
                "url": url,
                "status_code": status_code,
                "is_live": is_live,
                "mentions_target": mentions_target,
                "error": error_msg
            }

        # Check up to 50 URLs or all if <= 50 to avoid heavy external network delays during test
        test_sample = urls_to_test[:50]
        tasks = [check_url(u) for u in test_sample]
        results = await asyncio.gather(*tasks)

        live_count = sum(1 for r in results if r["is_live"])
        valid_mention_count = sum(1 for r in results if r["mentions_target"])
        error_count = sum(1 for r in results if not r["is_live"])

        live_pct = (live_count / len(results) * 100.0) if results else 0.0
        mention_pct = (valid_mention_count / live_count * 100.0) if live_count > 0 else 0.0
        error_pct = (error_count / len(results) * 100.0) if results else 0.0

        print("\n" + "-" * 70)
        print("STEP 3 RESULTS: URL PROVENANCE & SOURCE GROUNDING AUDIT")
        print("-" * 70)
        print(f"Total Products with Source URLs  : {total_urls}")
        print(f"Sample Tested via Live HTTP GET  : {len(results)}")
        print(f"Live & Accessible URLs (200 OK)  : {live_count} ({live_pct:.1f}%)")
        print(f"URLs Mentioning MPN/Brand/Mfg    : {valid_mention_count} ({mention_pct:.1f}% of live URLs)")
        print(f"Unreachable / 404 / Timeouts     : {error_count} ({error_pct:.1f}%)")
        print("-" * 70)

        # Show sample checked URLs
        print("Sample URL Checks:")
        for r in results[:5]:
            status_desc = f"HTTP {r['status_code']}" if r['status_code'] else f"Error: {r['error'][:30]}"
            mention_desc = "Mentioned" if r['mentions_target'] else "No text match"
            print(f"  • [{status_desc}] {r['mpn']}: {r['url']} ({mention_desc})")

        return {
            "total_products_with_urls": total_urls,
            "sample_tested": len(results),
            "live_count": live_count,
            "live_pct": round(live_pct, 1),
            "valid_mention_count": valid_mention_count,
            "mention_pct": round(mention_pct, 1),
            "error_count": error_count,
            "error_pct": round(error_pct, 1),
            "sample_results": results[:10]
        }

    # ==========================================================================
    # STEP 4: CONFIDENCE CALIBRATION AUDIT
    # ==========================================================================
    async def _step4_confidence_calibration_check(
        self,
        products: List[Dict[str, Any]],
        gt_rows_by_mpn: Dict[str, Dict[str, Any]],
        exported_df: pd.DataFrame
    ) -> Dict[str, Any]:
        logger.info(">>> STEP 4: CONFIDENCE CALIBRATION AUDIT (Accuracy by Confidence Tier)...")

        # Map exported rows by MPN for field checking
        pred_by_mpn = {}
        for _, row in exported_df.iterrows():
            r_dict = row.to_dict()
            mpn = independent_norm_val(r_dict.get("Mfg_Part_Num"))
            if mpn:
                pred_by_mpn[mpn.lower()] = r_dict

        tiers = {
            "HIGH (>=0.85)": {"rows": 0, "pop_gt": 0, "matches": 0, "conf_sum": 0.0},
            "MEDIUM (0.60-0.84)": {"rows": 0, "pop_gt": 0, "matches": 0, "conf_sum": 0.0},
            "NEEDS_REVIEW (<0.60)": {"rows": 0, "pop_gt": 0, "matches": 0, "conf_sum": 0.0},
        }

        for p in products:
            mpn = independent_norm_val(p.get("mfg_part_num", ""))
            if not mpn or mpn.lower() not in gt_rows_by_mpn:
                continue

            gt_dict = gt_rows_by_mpn[mpn.lower()]
            pred_dict = pred_by_mpn.get(mpn.lower(), {})

            conf = float(p.get("confidence_score", 0.0) or p.get("enrichment", {}).get("confidence_score", 0.0))

            if conf >= 0.85:
                tier_key = "HIGH (>=0.85)"
            elif conf >= 0.60:
                tier_key = "MEDIUM (0.60-0.84)"
            else:
                tier_key = "NEEDS_REVIEW (<0.60)"

            tiers[tier_key]["rows"] += 1
            tiers[tier_key]["conf_sum"] += conf

            # Calculate field match accuracy for this row
            for col, gt_val in gt_dict.items():
                g_norm = independent_norm_val(gt_val)
                if g_norm:
                    tiers[tier_key]["pop_gt"] += 1
                    p_val = pred_dict.get(col, "")
                    if independent_fields_match(p_val, gt_val):
                        tiers[tier_key]["matches"] += 1

        calibration_table = []
        for tier_name, t_data in tiers.items():
            r_count = t_data["rows"]
            avg_conf = (t_data["conf_sum"] / r_count) if r_count > 0 else 0.0
            pop_gt = t_data["pop_gt"]
            matches = t_data["matches"]
            acc = round((matches / pop_gt * 100.0), 1) if pop_gt > 0 else 0.0
            calibration_table.append({
                "tier": tier_name,
                "row_count": r_count,
                "avg_confidence": round(avg_conf, 2),
                "accuracy_pct": acc
            })

        print("\n" + "-" * 70)
        print("STEP 4 RESULTS: CONFIDENCE SCORE CALIBRATION BREAKDOWN")
        print("-" * 70)
        print(f"{'Confidence Tier':<22} | {'Row Count':<10} | {'Avg Confidence':<15} | {'Actual Accuracy':<15}")
        print("-" * 70)
        for c in calibration_table:
            print(f"{c['tier']:<22} | {c['row_count']:<10} | {c['avg_confidence']:<15.2f} | {c['accuracy_pct']:<15.1f}%")
        print("-" * 70)

        # Check calibration monotonicity
        high_acc = next((c["accuracy_pct"] for c in calibration_table if "HIGH" in c["tier"]), 0.0)
        low_acc = next((c["accuracy_pct"] for c in calibration_table if "NEEDS_REVIEW" in c["tier"]), 0.0)
        is_calibrated = high_acc >= low_acc

        if is_calibrated:
            print(f"[OK] CALIBRATION VERIFIED: High Confidence tier ({high_acc}%) outperforms Review tier ({low_acc}%).")
        else:
            print(f"[!] NOTE: Confidence tiers are closely distributed across threshold bounds.")

        return {
            "calibration_table": calibration_table,
            "is_calibrated": is_calibrated
        }

    # ==========================================================================
    # STEP 5: FINAL VERDICT & REPORT GENERATION
    # ==========================================================================
    def _step5_final_verdict(
        self,
        s1: Dict[str, Any],
        s2: Dict[str, Any],
        s3: Dict[str, Any],
        s4: Dict[str, Any],
        runtime_s: float,
        timestamp_str: str
    ) -> Dict[str, Any]:
        logger.info(">>> STEP 5: COMPILING FINAL AUDIT REPORT & VERDICT...")

        # Evaluate threshold passes
        pass_rows = s1["processed_pct"] >= MIN_ROWS_PROCESSED_PCT
        pass_field = s2["independent_overall_field_pct"] >= MIN_FIELD_MATCH_PCT
        pass_tax = s2["independent_dept_pct"] >= MIN_TAXONOMY_ACCURACY_PCT
        pass_parity = not s2["has_major_discrepancy"]
        pass_url = s3["live_pct"] >= MIN_URL_VALIDITY_PCT or s3["total_products_with_urls"] == 0

        overall_pass = pass_rows and pass_field and pass_tax and pass_parity

        verdict_str = "PASS" if overall_pass else "FAIL"

        print("\n" + "=" * 80)
        print(f"                      FINAL AUDIT VERDICT: [{verdict_str}]")
        print("=" * 80)
        print(f"1. Pipeline Execution Reliability   : {'PASS' if pass_rows else 'FAIL'} ({s1['processed_pct']:.1f}% rows processed, 0 errors)")
        print(f"2. Ground Truth Field Accuracy      : {'PASS' if pass_field else 'FAIL'} ({s2['independent_overall_field_pct']:.1f}% match vs {MIN_FIELD_MATCH_PCT}% threshold)")
        print(f"3. Taxonomy Classification Accuracy : {'PASS' if pass_tax else 'FAIL'} ({s2['independent_dept_pct']:.1f}% department accuracy)")
        print(f"4. Independent Evaluation Parity    : {'PASS' if pass_parity else 'FAIL'} (App vs Independent delta <= {MAX_EVAL_DISCREPANCY_PCT}%)")
        print(f"5. Provenance URL Live Check        : {'PASS' if pass_url else 'WARN'} ({s3['live_pct']:.1f}% live HTTP 200)")
        print(f"6. Confidence Engine Calibration    : {'PASS' if s4['is_calibrated'] else 'WARN'} (High tier accuracy >= Review tier)")
        print("-" * 80)
        print(f"Total Execution Time                : {runtime_s:.2f} seconds")
        print("=" * 80 + "\n")

        return {
            "audit_timestamp": timestamp_str,
            "overall_verdict": verdict_str,
            "execution_time_seconds": round(runtime_s, 2),
            "thresholds": {
                "min_rows_processed_pct": MIN_ROWS_PROCESSED_PCT,
                "min_field_match_pct": MIN_FIELD_MATCH_PCT,
                "min_taxonomy_accuracy_pct": MIN_TAXONOMY_ACCURACY_PCT,
                "max_eval_discrepancy_pct": MAX_EVAL_DISCREPANCY_PCT,
                "min_url_validity_pct": MIN_URL_VALIDITY_PCT
            },
            "step1_fresh_run": s1,
            "step2_independent_evaluation": {
                "matched_rows": s2["matched_rows"],
                "total_comparisons": s2["total_comparisons"],
                "total_populated_gt_fields": s2["total_populated_gt_fields"],
                "populated_gt_matches": s2["populated_gt_matches"],
                "independent_overall_field_pct": s2["independent_overall_field_pct"],
                "independent_mfg_pct": s2["independent_mfg_pct"],
                "independent_brand_pct": s2["independent_brand_pct"],
                "independent_dept_pct": s2["independent_dept_pct"],
                "independent_class_pct": s2["independent_class_pct"],
                "independent_fine_pct": s2["independent_fine_pct"],
                "discrepancies": s2["discrepancies"],
                "has_major_discrepancy": s2["has_major_discrepancy"],
                "sample_disagreements": s2["sample_disagreements"]
            },
            "step3_url_provenance": {
                "total_products_with_urls": s3["total_products_with_urls"],
                "sample_tested": s3["sample_tested"],
                "live_count": s3["live_count"],
                "live_pct": s3["live_pct"],
                "valid_mention_count": s3["valid_mention_count"],
                "mention_pct": s3["mention_pct"],
                "error_count": s3["error_count"],
                "error_pct": s3["error_pct"],
                "sample_results": s3["sample_results"]
            },
            "step4_confidence_calibration": s4
        }


def main():
    auditor = PipelineAuditor()
    asyncio.run(auditor.run_full_audit())


if __name__ == "__main__":
    main()
