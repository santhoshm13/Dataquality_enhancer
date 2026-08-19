import sys
import os
import asyncio
import pandas as pd
import logging
import time

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.pipeline.enrichment_pipeline import pipeline_engine
from app.database.repository import repository

logging.basicConfig(level=logging.INFO, format="%(levelname)s - %(message)s")
logger = logging.getLogger("scale_test")

async def run_scale_test(file_path: str):
    logger.info(f"Starting 1,000-item scale test on {file_path}")
    
    if not os.path.exists(file_path):
        logger.error(f"File not found: {file_path}")
        sys.exit(1)
        
    try:
        if file_path.endswith(".csv"):
            df = pd.read_csv(file_path).fillna("")
        else:
            df = pd.read_excel(file_path, engine="openpyxl").fillna("")
    except Exception as e:
        logger.error(f"Failed to read file: {e}")
        sys.exit(1)
        
    rows = df.to_dict(orient="records")
    total_items = len(rows)
    logger.info(f"Loaded {total_items} items.")
    
    repository.clear()
    
    start_time = time.perf_counter()
    
    processed_count = 0
    error_count = 0
    found_true_count = 0
    
    stage1_latencies = []
    stage2_latencies = []
    stage3_latencies = []
    total_row_latencies = []
    
    for idx, row in enumerate(rows):
        row_start = time.perf_counter()
        try:
            prod = repository.add_product(row)
            enriched = await pipeline_engine.run_pipeline(prod)
            repository.update_product(prod["id"], enriched)
            processed_count += 1
            
            row_duration = time.perf_counter() - row_start
            total_row_latencies.append(row_duration)
            
            # Check found status
            if enriched.get("found"):
                found_true_count += 1
                
            # Check stage timings if present
            st = enriched.get("stage_timings") or {}
            if "url_lookup_s" in st:
                stage1_latencies.append(st["url_lookup_s"])
            if "scrape_s" in st:
                stage2_latencies.append(st["scrape_s"])
            if "spec_extraction_s" in st:
                stage3_latencies.append(st["spec_extraction_s"])
                
            if (idx + 1) % 100 == 0:
                logger.info(f"Processed {idx + 1}/{total_items} items (Current found={found_true_count})...")
        except Exception as e:
            logger.error(f"Error processing row {idx}: {e}")
            error_count += 1
            
    total_elapsed = time.perf_counter() - start_time
    
    avg_total_latency = (sum(total_row_latencies) / len(total_row_latencies)) if total_row_latencies else 0.0
    avg_stage1 = (sum(stage1_latencies) / len(stage1_latencies)) if stage1_latencies else 0.0
    avg_stage2 = (sum(stage2_latencies) / len(stage2_latencies)) if stage2_latencies else 0.0
    avg_stage3 = (sum(stage3_latencies) / len(stage3_latencies)) if stage3_latencies else 0.0
    found_rate = (found_true_count / total_items * 100.0) if total_items else 0.0
    
    logger.info("=" * 70)
    logger.info("1,000-ROW DATASET SCALE TEST REPORT")
    logger.info("=" * 70)
    logger.info(f"Total Rows Evaluated     : {total_items}")
    logger.info(f"Successfully Processed   : {processed_count}")
    logger.info(f"Errors                   : {error_count}")
    logger.info(f"Total Time Taken         : {total_elapsed:.2f} seconds ({total_elapsed/60:.2f} minutes)")
    logger.info(f"New Found=True Count     : {found_true_count} / {total_items}")
    logger.info(f"New Found=True Rate      : {found_rate:.2f}%")
    logger.info("-" * 70)
    logger.info("AVERAGE PER-ROW LATENCY BREAKDOWN BY STAGE:")
    logger.info(f"  • Stage 1 (URL Lookup)        : {avg_stage1 * 1000:.2f} ms ({avg_stage1:.4f} s)")
    logger.info(f"  • Stage 2 (Page Scrape)       : {avg_stage2 * 1000:.2f} ms ({avg_stage2:.4f} s)")
    logger.info(f"  • Stage 3 (Spec Extraction)   : {avg_stage3 * 1000:.2f} ms ({avg_stage3:.4f} s)")
    logger.info(f"  • Overall Pipeline per row    : {avg_total_latency * 1000:.2f} ms ({avg_total_latency:.4f} s)")
    logger.info("=" * 70)

    return {
        "total_items": total_items,
        "processed_count": processed_count,
        "error_count": error_count,
        "total_elapsed_seconds": total_elapsed,
        "found_true_count": found_true_count,
        "found_true_rate_percent": found_rate,
        "avg_stage1_s": avg_stage1,
        "avg_stage2_s": avg_stage2,
        "avg_stage3_s": avg_stage3,
        "avg_total_latency_s": avg_total_latency
    }

if __name__ == "__main__":
    test_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "input", "Unihack_ Sample Dataset - Input.csv")
    if not os.path.exists(test_file):
        test_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "input", "Sample-1000_Items.xlsx")
    if not os.path.exists(test_file):
        test_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "input", "Unilog-Sample_200_Items-Input.csv")
    asyncio.run(run_scale_test(test_file))
