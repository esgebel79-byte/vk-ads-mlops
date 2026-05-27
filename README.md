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
