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
    
    start_time = time.time()
    
    processed_count = 0
    error_count = 0
    
    # Process sequentially as SQLite/Mock LLM is fast but we want to simulate stability
    for idx, row in enumerate(rows):
        try:
            prod = repository.add_product(row)
            enriched = await pipeline_engine.run_pipeline(prod)
            repository.update_product(prod["id"], enriched)
            processed_count += 1
            if (idx + 1) % 100 == 0:
                logger.info(f"Processed {idx + 1}/{total_items} items...")
        except Exception as e:
            logger.error(f"Error processing row {idx}: {e}")
            error_count += 1
            
    elapsed = time.time() - start_time
    logger.info("-" * 50)
    logger.info("Scale Test Completed.")
    logger.info(f"Total Time: {elapsed:.2f} seconds")
    logger.info(f"Average Time per item: {(elapsed / total_items):.4f} seconds" if total_items else "0")
    logger.info(f"Successfully processed: {processed_count}")
    logger.info(f"Errors: {error_count}")
    logger.info("-" * 50)

if __name__ == "__main__":
    test_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "input", "Sample-1000_Items.xlsx")
    # For offline testing we might just use the 200 items input if 1000 doesn't exist
    if not os.path.exists(test_file):
        test_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "input", "Unihack_ Sample Dataset - Input.csv")
    asyncio.run(run_scale_test(test_file))
