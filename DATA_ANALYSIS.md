# Data Analysis: AI Product Enrichment Platform

## 1. Executive Summary

This document presents the detailed structural and semantic analysis of the hackathon datasets provided for the **AI Product Enrichment Platform**:
- **Input Dataset**: `Unihack_ Sample Dataset - Input.csv` (1,000 rows, 6 columns)
- **Expected Output Dataset**: `Unihack_ Expected Output - Delivery Format.csv` (2 rows sample ground truth, 252 columns)

The goal of the enrichment platform is to transform un-enriched, sparse raw product data into a fully normalized, enterprise-grade 252-column product catalog conforming to industrial distribution delivery specifications.

---

## 2. Input Dataset Breakdown

The raw input file contains **6 columns**:

| # | Input Field Name | Description & Sample Data | Operational Characteristics |
|---|---|---|---|
| 1 | `Mfg_Part_Num` | e.g. `DCB518ASTS06G`, `PDSH4816AF` | Primary key / raw manufacturer part number. High cardinality, unique per product variant. |
| 2 | `Part_Desc` | e.g. `DCB518ASTS06G Diablo 1/2"x18" - Sanding Belt 6pc` | Raw product title containing mixed attributes (brand, dimensions, series, pack count). Primary input for AI attribute extraction. |
| 3 | `E1_Brand` | e.g. `-- Unbranded --` | Legacy ERP E1 brand tag. Frequently missing or uninformative. |
| 4 | `Unilog_Brand` | e.g. `-- No Unilog Brand --` | Unilog taxonomy brand tag. Frequently unpopulated. |
| 5 | `DIB_Brand` | e.g. `-- No DIB Brand --` | Distribution catalog brand tag. Frequently unpopulated. |
| 6 | `Part_Manuf` | e.g. `Freud Inc (2435)`, `Appliance Dealers Cooperative (APPDE)` | Raw vendor / manufacturer string often appended with internal vendor codes in parentheses. |

---

## 3. Output Dataset Taxonomy (252 Columns)

The expected output dataset defines a 252-column wide table. Analysis reveals that these 252 columns group logically into **6 operational categories**:

### A. Raw Pass-through & Metadata (Cols 1-7, 11-17, 21-22, 206-209, 211-214, 250-252)
- **Input Preservation**: `Mfg_Part_Num`, `Part_Desc`, `E1_Brand`, `Unilog_Brand`, `DIB_Brand`, `Part_Manuf` are passed through untouched.
- **Identifiers**: `PART_NUMBER`, `SKU - MY_PART_NUMBER`, `MANUFACTURER_PART_NUMBER`, `ALTERNATE_PART_NUMBER`, `UPC`, `EAN`, `GTIN`, `UNSPSC`.
- **Commerce Metadata**: `List Price`, `Selling Qty`, `Selling UOM`, `Standard Packaging Information`, `Country Of Origin`, `Discontinued`, `Actual Image (Yes/No)`.

### B. Master Data Matching & Classification (Cols 8-10, 18-20, 23, 55)
- **Taxonomy**: `Dept` (e.g. `Appliances`), `Class` (e.g. `Large Appliances`), `Fine` (e.g. `Dishwashers`), `Classpath` (`Appliances & Consumer Electronics>Kitchen Appliances>Built-In Dishwashers`).
- **Entity Resolution**: `MANUFACTURER_NAME` (e.g. `Rheem Manufacturing`), `BRAND_NAME` (e.g. `FRIGIDAIRE®`), `TRADE_NAME` (e.g. `Professional Series`), `Product Name` (e.g. `Dishwasher`).

### C. AI-Generated Descriptions (Cols 24-29)
- `MOBILE_DESC` (Character constrained concise text)
- `INVOICE_DESC` (Dense uppercase billing description)
- `SHORT_DESC` (Formatted feature summary)
- `LONG_DESC1` (Detailed spec sheet narrative)
- `RETAIL_DESC` (Customer-facing summary)
- `MARKETING_DESCRIPTION` (Promotional highlights)

### D. Features & Special Badging (Cols 30-54)
- `ITEM_FEATURES_1` through `ITEM_FEATURES_20` (Bullet points extracted from specs)
- `With`, `Standard/Approvals` (e.g. `ENERGY STAR Certified|NSF Certified`), `Prop 65`, `Application`, `Includes`.

### E. Dynamic Key-Value Attributes & UOMs (Cols 56-205)
- 50 repeating trios of `ATTRIBUTE_LABEL N`, `ATTRIBUTE_VALUE N`, `ATTRIBUTE_UOM N` (Cols 56-205).
- Examples:
  - Label: `Voltage Rating`, Value: `120`, UOM: `V`
  - Label: `Amperage Rating`, Value: `15`, UOM: `A`
  - Label: `Sound Level`, Value: `47`, UOM: `dBA`

### F. Assets, URLs & Physical Dimensions (Cols 1-6, 215-224, 225-249)
- `MFR URL`, `Ref URL 1..5`
- `LENGTH`, `HEIGHT`, `WIDTH`, `WEIGHT`, `VOLUME` (and respective `_UOM` columns)
- `Product Image`, `Alternate Image 1..4`, `SDS`, `Specification Sheet`, `Instruction/Installation Manual`, `Line Drawing`, etc.

---

## 4. Processing Requirement Matrix

Not every field should be passed to an LLM. Below is the strict architectural categorization of how fields are generated:

```
+-----------------------------------------------------------------------------------+
| 1. DETERMINISTIC PROCESSING                                                        |
|    - Mfg_Part_Num, Part_Desc, E1_Brand, Unilog_Brand, DIB_Brand, Part_Manuf       |
|    - PART_NUMBER, SKU - MY_PART_NUMBER (Generated internal IDs)                  |
|    - Actual Image (Yes/No) (Derived from Product Image presence)                  |
+-----------------------------------------------------------------------------------+
| 2. LOOKUP / FUZZY MATCHING (Master Data & Normalization)                         |
|    - MANUFACTURER_NAME (Fuzzy matched against Master Manufacturer list)           |
|    - BRAND_NAME (Fuzzy matched against Master Brand list)                         |
|    - Dept, Class, Fine, Classpath (Taxonomy hierarchy lookup)                      |
+-----------------------------------------------------------------------------------+
| 3. AI EXTRACTION + LOV/UOM VALIDATION                                             |
|    - ATTRIBUTE_LABEL 1..50, ATTRIBUTE_VALUE 1..50, ATTRIBUTE_UOM 1..50           |
|    - ITEM_FEATURES_1..20                                                          |
|    - With, Standard/Approvals, Product Name                                       |
+-----------------------------------------------------------------------------------+
| 4. AI GENERATION (Prompted with Validated Attributes)                              |
|    - MOBILE_DESC, INVOICE_DESC, SHORT_DESC, LONG_DESC1, RETAIL_DESC, MARKETING... |
+-----------------------------------------------------------------------------------+
| 5. EXTERNAL SOURCING / ASSETS                                                      |
|    - MFR URL, Ref URLs, Product Images, Specification Sheets, Manuals             |
+-----------------------------------------------------------------------------------+
```

---

## 5. Master Data & LOV Assumptions

Because master taxonomy and LOV files were not provided in the raw dataset download:
1. **Dynamic Master Tables**: We create seed tables for `manufacturers`, `brands`, `categories`, and `lov_values` in PostgreSQL.
2. **Auto-Learning / Expansion**: During fuzzy matching and AI attribute extraction, unknown values are evaluated against LOVs. If non-standard values are returned (e.g. `Polished Silver` instead of `Chrome`), the validation engine flags them as `NEEDS_REVIEW` and allows human reviewers to add approved values to the master LOV table.
3. **UOM Standard Table**: A standard lookup table for units of measure (`V`, `A`, `in`, `dBA`, `GPM`, `kW-hr`, `lb`, etc.) is pre-populated in the backend.

---

## 6. Architecture Implications

1. **Normalized Database Storage**: Do NOT store products with 252 SQL columns. Store product metadata, entities, structured attributes (key-value-uom array), and descriptions in dynamic relational tables.
2. **Delivery Format Generator**: Convert internal PostgreSQL dynamic structures into 252-column CSV export on demand using a dedicated `DeliveryFormatGenerator` engine.
