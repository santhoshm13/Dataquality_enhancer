# Dataset Architecture & Ingestion Audit Report

## 1. Audit Findings: Ingestion & Export Line Count Discrepancy

### Root Cause Analysis of 1,002 Exported Lines:
1. **Raw Input CSV Count**: `Unihack_ Sample Dataset - Input.csv` contains **1,000 raw product rows**.
   - Note: Part number `AVM6EV` appears 2 times natively in the original 1,000-row sample input file with different descriptions.
2. **Test File Upload**: During testing of the new Excel (`.xlsx`) parser, `excel_test_sample.xlsx` was uploaded (`EXCEL-TEST-001`), appending 1 new product record to the database repository.
3. **Total Stored Products**: 1,000 (from sample CSV) + 1 (from sample XLSX) = **1,001 product records** (IDs 1 to 1001).
4. **CSV Export Line Calculation**: 1 header row + 1,001 data rows = **1,002 lines total** in the exported CSV file.

---

## 2. Ingestion & Database Audit Responses

| Audit Question | Finding / Current Behavior |
|---|---|
| **1. Number of product records currently stored** | **1,001 product records** (IDs 1 to 1001). |
| **2. Number of unique `Mfg_Part_Num` values** | **1,000 unique values** (Part `AVM6EV` appears twice natively in input CSV). |
| **3. Do previous test uploads remain in database?** | **Yes**. Uploads currently accumulate in the repository. |
| **4. Does `/api/upload` append or replace?** | **Appends**. Every upload appends new rows into the products repository via `repository.bulk_add_products()`. |
| **5. Are duplicate products being inserted?** | **Yes**. Successive uploads of identical files append duplicate product records. |
| **6. Does export filter by dataset or export all?** | **Exports all**. `/api/export` executes `repository.get_all_products()`, exporting all stored products regardless of upload batch. |

---

## 3. Recommended Solution: Option A - Dataset / Job Scoped Architecture

To allow multiple hackathon uploads, test runs, and clean enterprise catalog management without data corruption or accidental record mixing, we recommend **Option A: Dataset / Job Scoped Architecture**.

```
+-----------------------------------------------------------------------+
|                             DATASETS                                  |
| id | name                                | file_type | row_count      |
|----+-------------------------------------+-----------+----------------|
| 1  | Unihack_ Sample Dataset - Input.csv | CSV       | 1000           |
| 2  | Appliance Batch 2026.xlsx           | XLSX      | 50             |
+-----------------------------------------------------------------------+
                                  | 1:N
                                  v
+-----------------------------------------------------------------------+
|                             PRODUCTS                                  |
| id | dataset_id | mfg_part_num | raw_description | enrichment...      |
+-----------------------------------------------------------------------+
```

---

## 4. Proposed Technical Design

### A. Database Schema Updates (`backend/app/database/schema.py`)

1. **`datasets` Table**:
```sql
CREATE TABLE IF NOT EXISTS datasets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    total_rows INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

2. **Foreign Key in `products`**:
```sql
ALTER TABLE products ADD COLUMN dataset_id INTEGER REFERENCES datasets(id) ON DELETE CASCADE;
CREATE INDEX idx_products_dataset_id ON products(dataset_id);
```

---

### B. API Route Updates

1. **`POST /api/upload`**:
   - Creates a new record in `datasets` (e.g. `name: "Unihack_ Sample Dataset - Input.csv"`, `total_rows: 1000`).
   - Links all ingested products to `dataset_id`.
   - Returns `dataset_id` in response.

2. **`GET /api/datasets`**:
   - Returns list of all uploaded datasets with row counts and upload timestamps.

3. **`GET /api/products?dataset_id={id}`**:
   - Filters products by `dataset_id`. Defaults to active/latest dataset.

4. **`POST /api/products/batch-enrich?dataset_id={id}`**:
   - Runs enrichment pipeline only on products belonging to the selected dataset.

5. **`GET /api/export?dataset_id={id}&format=csv|excel`**:
   - Exports 252-column CSV/Excel containing **only** products from the selected dataset.

---

### C. Frontend UI Component Updates

Add a **Dataset Selector Dropdown** in the Navbar header:

```
Dataset: [ Unihack_ Sample Dataset - Input.csv (1,000 items)  ▼ ]
```

- When a dataset is selected, all dashboard KPIs, product tables, batch pipeline triggers, and 252-column CSV/Excel exports automatically scope to that dataset.
- Includes a **Delete Dataset** or **Clear Repository** action for clean hackathon resetting.
