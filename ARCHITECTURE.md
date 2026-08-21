# AI Product Intelligence Enrichment Platform — Architecture

## Overview

A hackathon-grade, traceable product data enrichment pipeline that transforms raw
catalog entries (CSV/Excel) into 252-column Unilog delivery format — with full
field-level provenance for every output value.

**Hackathon judging criteria addressed:**
- **Accuracy** — Real evaluation against 200-item ground truth, `Mfg_Part_Num`-keyed, computed live
- **Traceability/Explainability** — Every field carries `{value, source, method, confidence, rationale}`
- **Scalability** — Async FastAPI + batch pipeline runner with progress tracking
- **Novelty** — LOV-constrained LLM extraction + deterministic-first cascade + human feedback loop

---

## Pipeline Architecture

```
INPUT (CSV/Excel)
        ¦
        ?
+---------------------------------------------------------+
¦  Stage 0: Ingestion & Normalization                      ¦
¦  • Multi-format CSV/XLSX ingestion                       ¦
¦  • Dataset isolation (dataset_id)                        ¦
¦  • Fraction normalization (Decimal_Fraction.xlsx)         ¦
+---------------------------------------------------------+
                         ¦
                         ?
+---------------------------------------------------------+
¦  Stage 1: Deterministic Matching (NO LLM)                ¦
¦  • Brand/Manufacturer: 4-stage cascade                   ¦
¦    exact ? normalized ? RapidFuzz fuzzy ? NEEDS_REVIEW   ¦
¦  • Checks learned human overrides FIRST                  ¦
¦  • Master records: PostgreSQL / SQLite fallback          ¦
¦  Source: master_data_lookup                              ¦
+---------------------------------------------------------+
                         ¦
                         ?
+---------------------------------------------------------+
¦  Stage 2: Category Classification                        ¦
¦  • Rule-based keyword matching (Dept/Class/Fine)         ¦
¦  • Classpath construction                                ¦
¦  • LOV retrieval by classpath (lov_retrieval_service)    ¦
¦  Source: category_classifier                             ¦
+---------------------------------------------------------+
                         ¦
                         ?
+---------------------------------------------------------+
¦  Stage 3: Source URL Discovery & Validation              ¦
¦  • LLM-guided manufacturer URL search                    ¦
¦  • HTTP HEAD validation + redirect following             ¦
¦  • Playwright fallback for JS-rendered pages             ¦
¦  Source: manufacturer_site / fallback                    ¦
+---------------------------------------------------------+
                         ¦
                         ?
+---------------------------------------------------------+
¦  Stage 4: LOV-Constrained Spec Extraction                ¦
¦  • LLM extracts structured JSON against LOV schema       ¦
¦  • validate_attributes_against_lov() filters hallucinations¦
¦  • UOM normalization via Unilog_Master_UOM_Standards.xlsx ¦
¦  Source: ai_lov_extraction / manufacturer_site_scrape    ¦
+---------------------------------------------------------+
                         ¦
                         ?
+---------------------------------------------------------+
¦  Stage 5: Confidence Scoring                             ¦
¦  • Weighted tier: brand_match + category + attributes    ¦
¦  • HIGH (=0.85) / MEDIUM (=0.60) / NEEDS_REVIEW (<0.60) ¦
¦  Source: confidence_engine                               ¦
+---------------------------------------------------------+
                         ¦
                         ?
+---------------------------------------------------------+
¦  Stage 6: Description Generation                         ¦
¦  • 6 UNILOG formats: INVOICE/MOBILE/SHORT/LONG/RETAIL/MKT¦
¦  • Hard character limits enforced with auto-truncation   ¦
¦  • Fact-grounded from validated attributes only          ¦
¦  Source: description_generator (LLM + facts)             ¦
+---------------------------------------------------------+
                         ¦
                         ?
+---------------------------------------------------------+
¦  Stage 7: Field Provenance Assembly                      ¦
¦  • field_provenance dict per product:                    ¦
¦    {field: {value, source, method, confidence, rationale}}¦
¦  • Covers: Manufacturer, Brand, Dept, Class, Fine, attrs  ¦
¦  • Stored in repository, served via API, shown in UI     ¦
+---------------------------------------------------------+
                         ¦
                         ?
+---------------------------------------------------------+
¦  252-Column Delivery Format Export                       ¦
¦  • delivery_formatter.py ? Unilog schema                 ¦
¦  • ZIP/XLSX download                                     ¦
+---------------------------------------------------------+
                         ¦
                         ?
+---------------------------------------------------------+
¦  Ground Truth Evaluation                                 ¦
¦  • Unilog-Sample_200_Items-Input-vs-Output.xlsx          ¦
¦  • Keyed by Mfg_Part_Num.strip().lower()                 ¦
¦  • Computes: brand/mfg/category/attribute/LOV/UOM/desc   ¦
¦  • POST /api/evaluation/run ? live JSON report           ¦
¦  • ZERO hardcoded numbers — all computed from real data  ¦
+---------------------------------------------------------+
                         ¦
                         ?
+---------------------------------------------------------+
¦  Human Review & Feedback Loop                            ¦
¦  • Review queue: NEEDS_REVIEW items sorted by confidence ¦
¦  • Inline field corrections via POST /api/products/{id}/correct¦
¦  • Corrections stored as learned overrides               ¦
¦  • Next pipeline run checks overrides BEFORE fuzzy match ¦
+---------------------------------------------------------+
```

---

## Traceability Record

Every output field carries:

```json
{
  "BRAND_NAME": {
    "value": "Diablo",
    "source": "master_data_lookup",
    "method": "fuzzy",
    "confidence": 0.92,
    "rationale": "Raw input 'Freud Inc (2435)' matched to canonical 'Diablo' via fuzzy matching (confidence: 92%)."
  },
  "attributes": {
    "Grit": {
      "value": "P80",
      "source": "ai_lov_extraction",
      "method": "llm_extraction",
      "confidence": 0.95,
      "validation_status": "PASS",
      "rationale": "Extracted from product description via LLM; validated against LOV: PASS."
    }
  }
}
```

Viewable in the "Grounding & Latency Trail" tab of any product detail modal.

---

## Tech Stack

| Layer       | Technology                                         |
|-------------|----------------------------------------------------|
| Backend     | FastAPI + Python 3.11                              |
| Matching    | RapidFuzz (4-stage cascade)                        |
| LLM         | Google Gemini / OpenAI / Mock (pluggable)          |
| Scraping    | httpx + Playwright (fallback)                      |
| Storage     | PostgreSQL / SQLite fallback + in-memory repo      |
| Frontend    | React + Vite + TypeScript + Framer Motion          |
| Evaluation  | pandas + openpyxl against 200-item XLSX ground truth |

---

## Key Design Principles

1. **Deterministic before LLM** — exact match ? normalization ? fuzzy ? only then LLM
2. **No fake numbers** — all accuracy metrics computed live from real ground truth
3. **Every field traceable** — `{value, source, method, confidence, rationale}` per field
4. **Feedback loop** — human corrections persist as learned overrides, improving future runs
5. **Dataset isolation** — `dataset_id` propagated throughout, preventing cross-batch contamination
