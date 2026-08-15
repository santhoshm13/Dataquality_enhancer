# AI Product Enrichment Platform

An enterprise-grade B2B platform designed to ingest raw, un-enriched product catalog CSVs, process them through a multi-stage AI normalization and validation pipeline, and output industrial distribution delivery format (252 columns).

---

## Architecture Overview

```
+-------------------+      HTTPS      +-----------------------+
|  React Frontend   | --------------> |    FastAPI Backend    |
|   (Vite + TS +    |                 |   (Python + Pydantic) |
|   Tailwind CSS)   |                 +-----------+-----------+
+-------------------+                             |
                                      +-----------+-----------+
                                      | Supabase PostgreSQL   |
                                      | & Dynamic Asset Store |
                                      +-----------------------+
```

---

## Key Pipeline Features

1. **CSV Ingestion & Validation**: Raw CSV file upload, preview, header validation, and preserved raw storage.
2. **Brand & Manufacturer Matching**: Deterministic exact matching, normalized matching, and RapidFuzz fuzzy matching with confidence thresholds.
3. **Category Classification**: Structured Pydantic classification mapping raw items to taxonomy departments and categories.
4. **AI Attribute Extraction & LOV Validation**: Structured extraction with deterministic validation against List of Values (LOV) master datasets and Units of Measure (UOMs).
5. **Confidence Engine**: Transparent field-level and product-level confidence scoring (`HIGH`, `MEDIUM`, `NEEDS_REVIEW`).
6. **AI Description Generation**: Rules-compliant multi-format descriptions (Invoice, Mobile, Short, Long, Retail, Marketing).
7. **252-Column Delivery Format Exporter**: Dynamic internal entity model converted into standard 252-column export CSV.

---

## Getting Started

### Backend Setup (FastAPI + Python)

```bash
cd backend
py -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup (React + Vite + TypeScript)

```bash
cd frontend
npm install
npm run dev
```

The application will run at `http://localhost:5173`.

---

## Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Set appropriate values for:
- `DATABASE_URL` (Supabase PostgreSQL Connection String)
- `SUPABASE_URL` / `SUPABASE_KEY`
- `LLM_API_KEY`
- `LLM_PROVIDER` (`mock`, `openai`, `gemini`)

---

## Live Deployment

- **Frontend**: Deploy `frontend/` to **Vercel**.
- **Backend**: Deploy `backend/` to **Render** or **Railway**.
- **Database**: Host on **Supabase PostgreSQL**.
