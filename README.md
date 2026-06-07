# VK Ads Reach Prediction MLOps

End-to-end MLOps project for predicting advertising campaign reach from auction history. Includes a FastAPI inference backend, a marketer-facing React dashboard, DVC-managed artifacts, and observability stack (MLflow, Prometheus, Grafana).

## Architecture

| Component | Role |
|-----------|------|
| **Backend API** | FastAPI inference service — health, metadata, single and sweep predictions |
| **Frontend UI** | React/Vite dashboard for campaign setup, CPM analysis, and system status |
| **DVC** | Versioned data and model artifacts (not committed to Git) |
| **MLflow** | Experiment tracking and model registry |
| **Prometheus / Grafana** | Metrics collection and dashboards |

Data and trained models live under `data/` and `models/` and are managed by DVC. Git tracks code, configs, and `.dvc` pointer files only.

## Frontend features

- English / Russian UI (i18n)
- Campaign prediction dashboard
- CPM scenario analysis (server-side sweep)
- Auction outlook and smart warnings
- Prediction history with filters and CSV export
- System status page (technical details for operators)

## Backend endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service and model readiness |
| GET | `/metadata` | Publisher universe, CPM bounds, time presets, limits |
| POST | `/predict` | Single campaign reach prediction |
| POST | `/predict/sweep` | CPM sensitivity sweep |
| GET | `/predictions/recent` | In-memory recent prediction history |
| GET | `/metrics` | Prometheus metrics |

Interactive API docs: http://localhost:8000/docs

## Local backend development

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r services/inference_api/requirements.txt
pip install -r services/inference_api/requirements-inference.txt
python -m uvicorn services.inference_api.app.main:app --host 127.0.0.1 --port 8000
```

On Linux/macOS, activate with `source .venv/bin/activate`.

If PowerShell blocks script execution:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

**Model artifacts:** `/predict` requires processed data and a trained model. If files are missing, run:

```powershell
python -m dvc pull
```

If remote access is unavailable, reproduce stages locally (when authorized):

```powershell
python -m dvc repro
```

Until artifacts exist, the API starts but `/predict` returns `503 Service Unavailable`.

## Local frontend development

```powershell
cd ui
npm install
copy .env.example .env
npm run dev
```

| URL | Purpose |
|-----|---------|
| http://localhost:5173 | Vite dev server |
| http://127.0.0.1:8000 | Backend API (set in `ui/.env`) |

Create `ui/.env` from `ui/.env.example`:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

The backend allows CORS from `localhost:5173` and `localhost:3001` by default.

## Full-stack Docker run

From the repository root:

```powershell
docker compose up -d --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3001 |
| Backend API docs | http://localhost:8000/docs |
| MLflow | http://localhost:5000 |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3000 (default login: `admin` / `admin`) |

The frontend container is built with `VITE_API_BASE_URL=http://localhost:8000` so the browser calls the API on the host-mapped port. Mount `./data` and `./models` into the API container (already configured); run `dvc pull` on the host before starting Docker if artifacts are missing.

Build API without heavy inference deps (health/metrics only):

```powershell
docker compose build --build-arg INSTALL_INFERENCE_DEPS=false api
```

## Environment variables

### Backend (API)

| Variable | Description |
|----------|-------------|
| `CORS_ALLOW_ORIGINS` | Comma-separated allowed origins (default includes `:5173` and `:3001`) |
| `MODEL_PATH` | Path to model weights |
| `MODEL_REPORT_PATH` | Path to model report JSON |
| `STAGE10_DIR` | Processed feature data directory |
| `CPM_MIN`, `CPM_MAX`, `CPM_STEP` | CPM slider defaults for `/metadata` |
| `CPM_MEDIAN_COMPETITOR`, `CPM_MAX_COMPETITOR` | Competitor CPM hints |
| `TIME_MIN_HOUR`, `TIME_MAX_HOUR` | Hour window bounds |
| `MAX_SWEEP_POINTS` | Max points per `/predict/sweep` (default `50`) |
| `SESSION_SILENCE_WINDOW_HOURS` | Session silence window for metadata |
| `DEFAULT_INFERENCE_USER_SAMPLE_SIZE` | Audience sample size when `user_ids` is empty (default `1000`) |
| `DRIFT_THRESHOLD`, `DRIFT_WINDOW_SIZE`, `DRIFT_MIN_BATCH` | Drift detection |
| `MLFLOW_TRACKING_URI` | MLflow server URL |

Set `CORS_ALLOW_ORIGINS=*` only when you explicitly need a wildcard.

### Frontend

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | Inference API base URL (build-time for production Docker image) |

## DVC and artifacts

- **Do not commit** generated data, models, `mlruns/`, or local caches to Git.
- Use **DVC** to pull or reproduce artifacts.
- `dvc pull` — download artifacts from remote (if configured).
- `dvc repro` — regenerate pipeline stages locally.
- `dvc push` — upload to remote **only with project owner approval**.

Pipeline definition: `dvc.yaml` and `params.yaml`.

## Testing and QA

### Backend

```powershell
python -m pip install -r tests/requirements.txt
python -m pytest
```

### Frontend

```powershell
cd ui
npm run build
npm run test
```

### Docker smoke test

```powershell
docker compose up -d --build
```

Verify:

- http://localhost:3001 — dashboard loads, API connected
- http://localhost:8000/health — model status
- http://localhost:8000/metadata — publishers and CPM metadata
- Campaign prediction and CPM sweep from the UI
- `/history` and `/system` routes
- Language switcher (EN/RU)

## Troubleshooting

| Issue | What to check |
|-------|----------------|
| API unavailable in UI | Backend running on port 8000; `VITE_API_BASE_URL` matches; browser can reach `http://localhost:8000/health` |
| CORS errors | Add your frontend origin to `CORS_ALLOW_ORIGINS`; avoid `*` unless intentional |
| `/predict` returns 503 | Missing model/data — run `dvc pull` or `dvc repro`; confirm `data/processed/stage10` and `models/deepsets/deepsets_attn.pt` exist |
| MLflow not on :5000 during training | Start stack with `docker compose up mlflow` or set `MLFLOW_TRACKING_URI` |
| Windows Unicode in MLflow logs | Use UTF-8 console or redirect logs if encoding errors appear |
| Docker port conflicts | Change host ports in `docker-compose.yml` or stop conflicting services |
| Empty publisher list in UI | Artifacts missing — `/metadata` still returns 200 with empty universe |

## Git contribution workflow

1. Create a feature branch from `main`.
2. Do **not** commit `data/`, `models/`, `.venv/`, `node_modules/`, `ui/dist/`, or `mlruns/`.
3. Do **not** push directly to `main`.
4. Open a Pull Request for review.

## Project layout

```
services/inference_api/   FastAPI inference service
ui/                       React marketer dashboard
src/                      Training pipeline (data, features, models, monitoring)
deployments/monitoring/   Prometheus & Grafana configs
deployments/k8s/          Kubernetes manifests (future)
tests/                    Backend tests
dvc.yaml                  DVC pipeline
docker-compose.yml        Full local stack
```

See [ui/README.md](ui/README.md) for frontend-specific documentation.
