# Deployment Guide

This document outlines the steps required to deploy the AI Product Enrichment Platform in a production environment.

## 1. Prerequisites

- **Python 3.11+** for the FastAPI backend.
- **Node.js 18+** (or 20+) for the React frontend.
- **PostgreSQL 14+** (Recommended) for robust multi-tenant data storage. SQLite is provided as a fallback but is not recommended for production.

## 2. Environment Variables

Create a `.env` file in the `backend/` directory based on `.env.example`:

```env
# Database (PostgreSQL recommended)
DATABASE_URL="postgresql://user:password@localhost:5432/unilog_db"

# LLM Provider Configuration
LLM_PROVIDER="mock"  # Options: mock, openai, gemini
OPENAI_API_KEY="your-openai-api-key"
GEMINI_API_KEY="your-gemini-api-key"
```

## 3. Database Initialization & Ingestion

Before starting the server, ensure you have ingested the master data (LOVs, Brands, Manufacturers) into the database.

1. Ensure all official data files are present in `data/lov` and `data/master`.
2. Run the ingestion script:

```bash
cd backend
python ingest_all_master_data.py
```

This will populate `master_data.db` (or your PostgreSQL database) with the official taxonomies and allowed values.

## 4. Backend Deployment

The backend is built with FastAPI. For production, deploy it using `uvicorn` with `gunicorn` or behind an Nginx reverse proxy.

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

## 5. Frontend Deployment

The frontend is a Vite + React application.

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Build the production bundle:
```bash
npm run build
```

3. Serve the `dist/` folder using a static file server like Nginx, Apache, or deploy to Vercel/Netlify.
Ensure your web server is configured to handle SPA routing (fallback to `index.html`).

## 6. Offline Testing & Verification

For verifying the pipeline offline, you can run the following test scripts from the root directory:

1. **Full Evaluation against Ground Truth**:
```bash
$env:PYTHONPATH="backend"
python backend/run_full_evaluation.py
```
This will output `evaluation_report.json` with 252-column schema metrics.

2. **1,000-Item Scale Test**:
```bash
$env:PYTHONPATH="backend"
python backend/run_scale_test.py
```
This simulates ingesting and enriching a 1,000-item dataset.
