# VK Ads Reach Prediction MLOps

MLOps-система для предсказания охвата рекламных кампаний на основе исторических данных аукциона.

## Стек

- Python
- FastAPI
- MLflow
- DVC
- Docker
- Prometheus
- Grafana
- Kubernetes
- ArgoCD

## Локальное окружение

Создайте виртуальное окружение внутри директории проекта. Папки `venv` и `.venv` не должны попадать в Git.

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r services\inference_api\requirements.txt
python -m pip install -r services\inference_api\requirements-inference.txt
```

Если PowerShell блокирует активацию окружения:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\venv\Scripts\Activate.ps1
```

## DVC pipeline

Pipeline описан в `dvc.yaml`, параметры вынесены в `params.yaml`.

```powershell
python -m dvc pull
python -m dvc repro stage5_train_model
```

Если DVC remote не настроен, нужно положить исходные данные в `data/raw` и запустить:

```powershell
python -m dvc repro
```

## FastAPI service

Локальный запуск API:

```powershell
python -m uvicorn services.inference_api.app.main:app --host 127.0.0.1 --port 8000 --reload
```

Также можно запустить файл напрямую:

```powershell
python services\inference_api\app\main.py
```

Полезные URL:

- Swagger UI: http://127.0.0.1:8000/docs
- Health check: http://127.0.0.1:8000/health
- Prometheus metrics: http://127.0.0.1:8000/metrics

Endpoint `/predict` требует готовые model artifacts:

- `data/processed/stage10`
- `models/deepsets/deepsets_attn.pt`

До появления этих файлов API может запускаться, но `/predict` будет возвращать `503 Service Unavailable`.

## Frontend integration (Phase 1)

Backend endpoints for the future `ui/` frontend. The UI will be bilingual (English / Russian); API responses are locale-neutral JSON.

### Local development URLs

- FastAPI backend: http://127.0.0.1:8000
- Swagger UI: http://127.0.0.1:8000/docs
- Planned Vite dev server: http://localhost:5173
- Alternate local UI port: http://localhost:3001

### CORS

The API enables CORS via `CORSMiddleware`. Allowed origins are read from `CORS_ALLOW_ORIGINS` (comma-separated list).

Default local origins:

- `http://localhost:5173`
- `http://127.0.0.1:5173`
- `http://localhost:3001`
- `http://127.0.0.1:3001`

Set `CORS_ALLOW_ORIGINS=*` only when you explicitly need a wildcard.

### GET /metadata

Returns frontend-safe configuration without exposing internal artifact paths.

Example:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/metadata
```

Top-level fields:

- `model_ready`, `model_loaded`, `model_version`
- `publisher_universe` — loaded from `pub_universe.npy` when available
- `cpm` — slider bounds and competitor CPM hints (`source`: `artifact`, `config`, or `unavailable`)
- `time` — hour window presets for campaign scheduling
- `limits` — `max_sweep_points`, `max_recent_predictions`

Optional environment variables:

- `CPM_MIN`, `CPM_MAX`, `CPM_STEP`
- `CPM_MEDIAN_COMPETITOR`, `CPM_MAX_COMPETITOR`
- `TIME_MIN_HOUR`, `TIME_MAX_HOUR`
- `MAX_SWEEP_POINTS`, `SESSION_SILENCE_WINDOW_HOURS`

If artifacts are missing, the endpoint still returns `200 OK` with an empty `publisher_universe`.

### POST /predict/sweep

Runs a CPM sensitivity sweep server-side (sequential inference). The frontend should call this endpoint instead of many parallel `/predict` requests.

Request:

```json
{
  "base_request": {
    "hour_start": 0,
    "hour_end": 24,
    "publishers": [101, 204],
    "audience_size": 50000,
    "user_ids": []
  },
  "cpm_range": {
    "min": 5,
    "max": 60,
    "step": 5
  }
}
```

Response:

```json
{
  "sweep_id": "550e8400-e29b-41d4-a716-446655440000",
  "points": [
    {
      "cpm": 5,
      "at_least_one": 0.21,
      "at_least_two": 0.08,
      "at_least_three": 0.02,
      "predicted_reach": 10500,
      "drift_flag": false
    }
  ],
  "model_version": "deepsets_attention",
  "latency_seconds": 1.23
}
```

Validation:

- `cpm_range.min >= 0`, `cpm_range.max >= cpm_range.min`, `cpm_range.step > 0`
- number of sweep points must not exceed `MAX_SWEEP_POINTS` (default `50`)
- same campaign window rules as `/predict`

Sweep results are not appended to `/predictions/recent` item-by-item.

### Tests

```powershell
python -m pip install -r tests\requirements.txt
python -m pytest
```

## Docker Compose

Быстрая проверка API без model artifacts:

```powershell
docker compose build api
docker compose up -d api
```

Полный запуск service stack:

```powershell
docker compose up -d --build
```

По умолчанию `docker-compose.yml` собирает API с inference-зависимостями (`torch`, `mlflow`, `dvc`, `dvc-gdrive`), поэтому после `dvc pull` и наличия model artifacts endpoint `/predict` готов к работе. Для легкой сборки только под `/health` и `/metrics` можно переопределить build-arg:

```powershell
docker compose build --build-arg INSTALL_INFERENCE_DEPS=false api
```

Service URLs:

- FastAPI: http://127.0.0.1:8000/docs
- MLflow: http://127.0.0.1:5000
- Prometheus: http://127.0.0.1:9090
- Grafana: http://127.0.0.1:3000

Данные для входа в Grafana по умолчанию:

```text
admin / admin
```

## Структура проекта

- `src/data` - подготовка данных
- `src/features` - feature engineering
- `src/models` - обучение и оценка моделей
- `src/monitoring` - drift detection
- `services/inference_api` - FastAPI inference service
- `deployments/monitoring` - конфигурация Prometheus и Grafana
- `deployments/k8s` - будущие Kubernetes manifests
- `deployments/argocd` - будущая ArgoCD configuration
- `tests` - тесты
- `ui` - будущий веб-интерфейс
