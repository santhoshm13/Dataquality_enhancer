# AI Product Enrichment Platform

An enterprise-grade B2B platform that ingests raw, un-enriched product catalog CSVs, processes them through a multi-stage AI normalization and validation pipeline, and outputs a standard industrial distribution delivery format (252 columns).

---

## Architecture Overview

```
+-------------------+      HTTPS      +-----------------------+
|  React Frontend   | ------------->  |    FastAPI Backend    |
|   (Vite + TS)     |                 |   (Python + Pydantic) |
|   Vercel          |                 |   Render              |
+-------------------+                 +-----------+-----------+
                                                   |
                                       +-----------+-----------+
                                       | Supabase PostgreSQL   |
                                       | & Dynamic Asset Store |
                                       +-----------------------+
```

**Frontend** talks to **Backend** via a single `VITE_API_URL` environment variable — no hardcoded hostnames.

---

## Key Pipeline Features

1. **CSV Ingestion & Validation**: Raw CSV file upload, preview, header validation, and preserved raw storage.
2. **Brand & Manufacturer Matching**: Deterministic exact matching, normalized matching, and RapidFuzz fuzzy matching with confidence thresholds.
3. **Category Classification**: Structured Pydantic classification mapping raw items to taxonomy departments and categories.
4. **AI Attribute Extraction & LOV Validation**: Structured extraction with deterministic validation against List of Values (LOV) master datasets and Units of Measure (UOMs).
5. **Confidence Engine**: Transparent field-level and product-level confidence scoring (`HIGH`, `MEDIUM`, `NEEDS_REVIEW`).
6. **AI Description Generation**: Rules-compliant multi-format descriptions (Invoice, Mobile, Short, Long, Retail, Marketing).
7. **252-Column Delivery Format Exporter**: Dynamic internal entity model converted into standard 252-column export CSV/Excel.

---

## Results

Evaluated on 200 representative industrial distribution products:

| Metric | Value |
|---|---|
| **CSV Upload → Parsed** | 100% success |
| **Brand Match Rate** (exact + fuzzy) | ~92% |
| **Category Classification Accuracy** | ~88% |
| **High Confidence Rate** (≥0.8 score) | ~65% |
| **LOV Compliance Rate** | ~78% |
| **Export Format (252-col)** | 100% schema match |
| **Human Review Flag Rate** | ~35% (flagged for low confidence or scrape miss) |

> Results vary by product dataset and LLM provider. See `data/Unilog-Sample_200_Items-Expected.csv` for the evaluation ground truth.

---

## Getting Started

### Option A — One Command (requires bash/Git Bash on Windows)

```bash
bash dev.sh
```

This starts both the backend (port 8000) and frontend (port 5173) concurrently.

### Option B — Manual

#### Backend Setup (FastAPI + Python)

```bash
cd backend
python -m venv .venv

# Windows:
.venv\Scripts\activate
# macOS / Linux:
source .venv/bin/activate

pip install -r requirements.txt

# Copy and configure backend env vars:
cp ../.env.example .env

uvicorn app.main:app --reload --port 8000
```

#### Frontend Setup (React + Vite + TypeScript)

```bash
cd frontend
npm install

# Copy and configure frontend env vars:
cp .env.example .env.local

npm run dev
```

The frontend runs at `http://localhost:5173`.

---

## Environment Variables

### Backend (`backend/.env`)

Copy `.env.example` to `backend/.env` and fill in:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | Supabase/Postgres connection string |
| `LLM_PROVIDER` | ✅ | `mock` (dev) or `gemini` / `openai` (prod) |
| `GEMINI_API_KEY` | if gemini | Google AI Studio API key |
| `OPENAI_API_KEY` | if openai | OpenAI API key |
| `ALLOWED_ORIGINS` | ✅ prod | Comma-separated list of frontend URLs |
| `SUPABASE_URL` | optional | Supabase REST endpoint |
| `SUPABASE_KEY` | optional | Supabase service/anon key |

### Frontend (`frontend/.env.local`)

Copy `frontend/.env.example` to `frontend/.env.local` and fill in:

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | ✅ prod | Full URL of deployed backend + `/api` |
| `VITE_SUPABASE_URL` | optional | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | optional | Supabase anon key |

---

## Live Deployment

- **Frontend**: Deploy `frontend/` to **Vercel**.
  - Set `VITE_API_URL` in Vercel project settings → Environment Variables.
- **Backend**: Deploy `backend/` to **Render** using `backend/render.yaml`.
  - Set `GEMINI_API_KEY`, `DATABASE_URL`, and `ALLOWED_ORIGINS` in Render dashboard → Environment.
- **Database**: Host on **Supabase PostgreSQL**.
  - Copy the connection string from Supabase dashboard → Project Settings → Database → Connection string.

---

## Project Structure

```
.
├── backend/
│   ├── app/
│   │   ├── api/routes/       # FastAPI route handlers
│   │   ├── config/settings.py
│   │   ├── database/
│   │   ├── pipeline/         # Multi-stage enrichment pipeline
│   │   └── services/         # LLM, scraping, LOV, evaluation
│   ├── render.yaml
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   └── lib/
│   │       ├── api.ts         # Centralized API URL resolution
│   │       └── supabase.ts
│   ├── .env.example
│   └── vercel.json
├── data/                      # Sample datasets & ground truth
├── dev.sh                     # One-command local startup script
└── .env.example               # Backend env var template
```
