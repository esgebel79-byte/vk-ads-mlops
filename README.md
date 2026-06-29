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
| **Kubernetes / minikube** | Local production-like deployment for API and UI services |
| **ArgoCD** | GitOps synchronization of Kubernetes manifests |
| **GitHub Actions / GHCR** | CI/CD image build and publication |

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


## Kubernetes / minikube local deployment

The repository contains Kubernetes manifests for local production-like validation in `deployments/k8s/`.

Manifests:

| File | Purpose |
|------|---------|
| `deployments/k8s/namespace.yaml` | Project namespace |
| `deployments/k8s/api-configmap.yaml` | Backend API configuration |
| `deployments/k8s/api-deployment.yaml` | Backend API Deployment |
| `deployments/k8s/api-service.yaml` | Backend API Service |
| `deployments/k8s/ui-configmap.yaml` | Frontend configuration |
| `deployments/k8s/ui-deployment.yaml` | Frontend Deployment |
| `deployments/k8s/ui-service.yaml` | Frontend Service |

### Start minikube

```powershell
minikube start --driver=docker --memory=3072 --cpus=2 --disk-size=20g
kubectl get nodes
```

### Build the local API image with inference dependencies

The API image must be built with `INSTALL_INFERENCE_DEPS=true`; otherwise `/predict` may fail because packages such as `numpy`, `pandas`, and `torch` are not installed.

```powershell
docker build `
  -f services/inference_api/Dockerfile `
  --build-arg INSTALL_INFERENCE_DEPS=true `
  -t vk-ads-mlops-api:local `
  .
```

Load the local image into minikube:

```powershell
minikube image load vk-ads-mlops-api:local
minikube image ls | Select-String "vk-ads-mlops-api"
```

Expected image:

```text
docker.io/library/vk-ads-mlops-api:local
```

### Mount local DVC artifacts into minikube

The API pod expects model and data artifacts under `/app/models` and `/app/data`. For local minikube runs, mount the project directory into the minikube VM.

Open a separate PowerShell window and keep it running:

```powershell
cd D:\PythonProjects\vk-ads-mlops
minikube mount D:\PythonProjects\vk-ads-mlops:/mnt/vk-ads-mlops
```

If this window is closed, the API pod loses access to local `data/` and `models/`.

### Apply Kubernetes manifests

From the repository root:

```powershell
kubectl apply -f deployments\k8s
kubectl get all -n vk-ads-mlops
```

### Use the local API image in minikube

If `api-deployment.yaml` points to GHCR, temporarily patch the deployment to use the local image:

```powershell
kubectl patch deployment vk-ads-api -n vk-ads-mlops --type='json' -p='[
  {"op":"replace","path":"/spec/template/spec/containers/0/image","value":"vk-ads-mlops-api:local"},
  {"op":"replace","path":"/spec/template/spec/containers/0/imagePullPolicy","value":"Never"}
]'
```

Wait for rollout:

```powershell
kubectl rollout status deployment/vk-ads-api -n vk-ads-mlops
kubectl get pods -n vk-ads-mlops
```

### Verify dependencies inside the API pod

```powershell
kubectl exec -n vk-ads-mlops deployment/vk-ads-api -- python -c "import numpy; import pandas; import torch; print('basic ok')"
```

Expected output:

```text
basic ok
```

Project imports:

```powershell
kubectl exec -n vk-ads-mlops deployment/vk-ads-api -- python -c "from src.features.prepare_deepsets_dataset import build_campaign_features; from src.monitoring.drift import data_drift_report; from src.models.train_deepsets_attention import HeavyDeepSets; print('inference imports ok')"
```

Expected output:

```text
inference imports ok
```

### Port-forward API and UI

Open a separate PowerShell window for the API:

```powershell
kubectl port-forward -n vk-ads-mlops svc/vk-ads-api-service 8000:80
```

Open another PowerShell window for the UI:

```powershell
kubectl port-forward -n vk-ads-mlops svc/vk-ads-ui-service 3001:80
```

Local URLs:

| Service | URL |
|---------|-----|
| Frontend UI | http://127.0.0.1:3001 |
| Backend health | http://127.0.0.1:8000/health |
| Backend docs | http://127.0.0.1:8000/docs |

### Smoke-test the Kubernetes deployment

Health check:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health | ConvertTo-Json -Depth 10
```

Expected critical fields:

```json
{
  "status": "ok",
  "model_ready": true
}
```

Prediction:

```powershell
$body = @{
  hour_start = 0
  hour_end = 24
  publishers = @()
  audience_size = 100
  user_ids = @()
  cpm = 50
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri http://127.0.0.1:8000/predict `
  -ContentType "application/json" `
  -Body $body | ConvertTo-Json -Depth 10
```

Expected response fields:

```text
at_least_one
at_least_two
at_least_three
model_version
drift_flag
prediction_id
```

## ArgoCD GitOps deployment

The repository contains an ArgoCD Application manifest:

```text
deployments/argocd/application.yaml
```

The Application syncs Kubernetes resources from:

```text
repoURL: https://github.com/esgebel79-byte/vk-ads-mlops.git
targetRevision: k8s-argocd
path: deployments/k8s
```

### Install ArgoCD in minikube

```powershell
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

Wait for ArgoCD components:

```powershell
kubectl wait --for=condition=available --timeout=300s deployment/argocd-server -n argocd
kubectl wait --for=condition=available --timeout=300s deployment/argocd-repo-server -n argocd
kubectl wait --for=condition=available --timeout=300s deployment/argocd-applicationset-controller -n argocd
kubectl wait --for=condition=ready --timeout=300s pod -l app.kubernetes.io/name=argocd-redis -n argocd
kubectl get pods -n argocd
```

### Apply the ArgoCD Application

```powershell
kubectl apply -f deployments\argocd\application.yaml
kubectl get applications -n argocd
```

Expected status:

```text
vk-ads-mlops   Synced   Healthy
```

Detailed check:

```powershell
kubectl describe application vk-ads-mlops -n argocd
```

Look for:

```text
Health:
  Status: Healthy

Sync:
  Status: Synced

Operation State:
  Phase: Succeeded
```

### Open the ArgoCD UI

Port-forward the ArgoCD server:

```powershell
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

Open:

```text
https://127.0.0.1:8080
```

Get the initial admin password:

```powershell
kubectl -n argocd get secret argocd-initial-admin-secret `
  -o jsonpath="{.data.password}" | ForEach-Object {
    [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($_))
  }
```

Login:

```text
username: admin
password: <command output>
```

Application to check:

```text
vk-ads-mlops
```

Expected ArgoCD UI status:

```text
Synced
Healthy
```

## CI/CD and GHCR images

GitHub Actions workflows are stored in:

```text
.github/workflows/cd.yml
.github/workflows/release_on_tag.yml
```

The API image must be built with inference dependencies:

```yaml
build-args: |
  INSTALL_INFERENCE_DEPS=true
```

After merge to `main`, CI should publish:

```text
ghcr.io/esgebel79-byte/vk-ads-mlops-api:latest
ghcr.io/esgebel79-byte/vk-ads-mlops-ui:latest
```

ArgoCD can then sync Kubernetes manifests that reference GHCR images. For local minikube checks before the GHCR image is rebuilt, use `vk-ads-mlops-api:local` and `imagePullPolicy: Never`.


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
| `/predict` returns 503 in Kubernetes | Verify the API image was built with `INSTALL_INFERENCE_DEPS=true`; run `kubectl exec ... import numpy` |
| `model_ready=false` in Kubernetes | Keep `minikube mount` running and verify `/app/models` and `/app/data` inside the API pod |
| ArgoCD `OutOfSync` | Check `repoURL`, `targetRevision`, and `path` in `deployments/argocd/application.yaml` |
| Docker build hangs on `exporting layers` | Check free disk space; run `docker builder prune -af` and `docker system prune -af` after Docker is healthy |

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
deployments/k8s/          Kubernetes manifests for API/UI
deployments/argocd/       ArgoCD Application manifest
tests/                    Backend tests
dvc.yaml                  DVC pipeline
docker-compose.yml        Full local stack
```

See [ui/README.md](ui/README.md) for frontend-specific documentation.
