# VK Ads MLOps Testing Guide

This document describes how to verify the local MLOps stack, API inference, monitoring ports, MLflow tracking, and an optional short training smoke test.

## DVC Google Drive Setup

The repository-level DVC config should contain only the shared Google Drive folder ID:

```ini
['remote "myremote"']
    url = gdrive://1egdZtrdjo3L2Ss8ZgWd8wrbGpPMJhNym
```

Do not commit real Google Drive OAuth credentials. They must be configured locally on each machine:

```powershell
dvc remote modify --local myremote gdrive_client_id "YOUR_CLIENT_ID"
dvc remote modify --local myremote gdrive_client_secret "YOUR_CLIENT_SECRET"
dvc pull
```

These commands create or update `.dvc/config.local`. This file is intentionally ignored by Git and should stay private to each computer.

`YOUR_CLIENT_ID` and `YOUR_CLIENT_SECRET` are Google OAuth client credentials, not a personal Google username or password. Use the project OAuth credentials provided by the project owner, or create a separate OAuth client in Google Cloud. The Google account selected during the browser authentication flow must still have access to the shared Google Drive folder.

If the folder is shared by URL, use only the folder ID in DVC:

```text
https://drive.google.com/drive/folders/1egdZtrdjo3L2Ss8ZgWd8wrbGpPMJhNym?usp=sharing
```

becomes:

```text
gdrive://1egdZtrdjo3L2Ss8ZgWd8wrbGpPMJhNym
```

## 1. Start The Service Stack

Run from the project root:

```powershell
docker compose up -d api mlflow prometheus grafana
```

Check service status:

```powershell
docker compose ps
```

Expected services:

- `api`: `127.0.0.1:8000->8000/tcp`
- `mlflow`: `127.0.0.1:5000->5000/tcp`
- `prometheus`: `127.0.0.1:9090->9090/tcp`
- `grafana`: `127.0.0.1:3000->3000/tcp`

All four services should be `Up`.

## 2. API Tests On Port 8000

### Root Endpoint

```powershell
Invoke-RestMethod http://127.0.0.1:8000/
```

Expected response:

```json
{
  "service": "vk-ads-reach-prediction-api",
  "health": "/health",
  "docs": "/docs",
  "metrics": "/metrics"
}
```

### Health Check

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
```

Expected fields:

```json
{
  "status": "ok",
  "model_ready": true
}
```

`model_ready=true` means the required model and `stage10` artifacts are available. Before the first prediction, `model_loaded` may be `false`. After calling `/predict`, it should become `true`.

### Swagger UI

Open in a browser:

```text
http://127.0.0.1:8000/docs
```

Use this page to test API endpoints interactively.

### POST /predict

`/predict` only accepts `POST`. Opening this URL directly in a browser sends a `GET` request:

```text
http://127.0.0.1:8000/predict
```

That returns:

```json
{"detail":"Method Not Allowed"}
```

Use this PowerShell command instead:

```powershell
$body = @{
  cpm = 100.0
  hour_start = 720
  hour_end = 744
  publishers = @(1, 2, 3)
  audience_size = 1000
  user_ids = @(1, 2, 3, 4)
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri http://127.0.0.1:8000/predict `
  -ContentType "application/json" `
  -Body $body
```

Example response:

```json
{
  "at_least_one": 0.1926610916852951,
  "at_least_two": 0.03265774995088577,
  "at_least_three": 0.0,
  "model_version": "deepsets_attention",
  "drift_flag": false,
  "prediction_id": "..."
}
```

Interpretation:

- `at_least_one`: predicted probability of reaching a user at least once.
- `at_least_two`: predicted probability of reaching a user at least twice.
- `at_least_three`: predicted probability of reaching a user at least three times.
- `drift_flag`: whether the request triggered a drift warning.
- `prediction_id`: unique ID for this prediction request.

The values come from the model checkpoint at `models/deepsets/deepsets_attn.pt`.

Inference flow:

1. The API receives the campaign request.
2. It reuses the pipeline feature engineering function `build_campaign_features`.
3. The campaign feature vector is normalized with `camp_mean` and `camp_std` from the checkpoint.
4. User features are loaded from `data/processed/stage10/user_feat.npy`.
5. The `HeavyDeepSets` model performs a forward pass.
6. `clip_monotone_np` clips predictions into `[0, 1]` and enforces:
   `at_least_three <= at_least_two <= at_least_one`.

For the example above, one reproduced raw model output was:

```text
raw = [0.1926610917, 0.0326577574, -0.0001322236]
```

After clipping:

```text
clipped = [0.1926610917, 0.0326577574, 0.0]
```

The third value becomes `0.0` because probabilities cannot be negative.

### Recent Predictions

```powershell
Invoke-RestMethod http://127.0.0.1:8000/predictions/recent
```

After a successful `/predict` call, this endpoint should return at least one recent prediction item.

### API Metrics

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/metrics
```

Expected output is Prometheus text format. Useful metrics include:

- `prediction_count`
- `prediction_latency_seconds`
- `prediction_error_count`
- `drift_alert_count`
- `retrain_trigger_count`
- `model_mae`
- `model_rmse`

## 3. MLflow On Port 5000

Open:

```text
http://127.0.0.1:5000
```

The MLflow service in `docker-compose.yml` runs as a tracking server with a SQLite backend:

```text
sqlite:////mlruns/mlflow.db
```

This is important: MLflow data is not synchronized automatically between machines. A training script writes experiment data only to the tracking URI that it uses.

If training runs inside the Docker Compose network, use:

```text
http://mlflow:5000
```

If training runs from the host machine, use:

```text
http://127.0.0.1:5000
```

If training uses `file:./mlruns`, it writes local files directly and may not appear in the running MLflow server if the server uses a different backend.

Check MLflow experiments through the API:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri http://127.0.0.1:5000/api/2.0/mlflow/experiments/search `
  -ContentType "application/json" `
  -Body '{"max_results":10}'
```

If this returns `{}` or the page has no experiments, the MLflow server is running but `./mlruns` does not contain active experiment runs yet.

### What MLflow Is

MLflow is an experiment tracking tool for machine learning. It records:

- training parameters, such as `seed`, `epochs`, `batch_size`, and `lr`;
- metrics, such as `MAE`, `RMSE`, and `R2`;
- artifacts, such as model checkpoints, prediction files, and JSON reports;
- experiment and run history.

MLflow and DVC serve different purposes:

- DVC stores and retrieves data and model artifacts, such as `data/processed/stage10` and `models/deepsets/deepsets_attn.pt`.
- MLflow stores training experiment logs and makes them visible in a web UI.

If model artifacts were restored through DVC but the corresponding `mlruns` directory was not restored, the API can still predict while the MLflow page remains empty.

To create MLflow records locally, run a training job with `--mlflow-tracking-uri http://mlflow:5000` inside Docker, or with `--mlflow-tracking-uri http://127.0.0.1:5000` from the host.

## 4. Optional Training Smoke Test

This test verifies that the training code and MLflow logging work without overwriting the production model directory.

Use this section when validating the project on another computer as well. The important rule is that the training process must write to the same MLflow tracking server that is opened in the browser.

For a local demonstration on any computer:

1. Start the stack:

```powershell
docker compose up -d api mlflow prometheus grafana
```

2. Open MLflow:

```text
http://127.0.0.1:5000
```

3. Run the training smoke test inside the API container.

Run from the project root inside the API container:

```powershell
docker compose exec -T api python src/models/train_deepsets_attention.py `
  --stage10-dir /app/data/processed/stage10 `
  --out-dir /app/models/deepsets_smoke `
  --seed 42 `
  --epochs 1 `
  --batch-size 128 `
  --lr 0.002 `
  --device cpu `
  --model-type deepsets_attention_smoke `
  --mlflow-tracking-uri http://mlflow:5000 `
  --mlflow-experiment vk-ads-smoke-test
```

Equivalent command from the host machine:

```powershell
.\venv\Scripts\python.exe src\models\train_deepsets_attention.py `
  --stage10-dir data/processed/stage10 `
  --out-dir models/deepsets_smoke `
  --seed 42 `
  --epochs 1 `
  --batch-size 128 `
  --lr 0.002 `
  --device cpu `
  --model-type deepsets_attention_smoke `
  --mlflow-tracking-uri http://127.0.0.1:5000 `
  --mlflow-experiment vk-ads-smoke-test
```

Expected outputs:

- `models/deepsets_smoke/deepsets_attn.pt`
- `models/deepsets_smoke/predictions_deepsets_attn.tsv`
- `models/deepsets_smoke/report_stage13.json`
- a new MLflow experiment or run under `./mlruns`

After this, refresh:

```text
http://127.0.0.1:5000
```

The smoke-test run should appear in MLflow.

Expected MLflow entries:

```text
experiment: vk-ads-smoke-test
run: deepsets_attention_smoke
```

This works because the training command uses:

```text
--mlflow-tracking-uri http://mlflow:5000
```

Inside Docker Compose, `mlflow` is the service name of the MLflow container. The browser still opens the same server through:

```text
http://127.0.0.1:5000
```

So after training finishes, refreshing the MLflow page should show the experiment and run.

For full DVC training, use:

```powershell
.\venv\Scripts\python.exe -m dvc repro stage5_train_model
```

This full command writes to `models/deepsets`, so use it only when you intentionally want to regenerate the tracked model output.

Important: the DVC stage uses the tracking URI from `params.yaml`:

```yaml
mlflow:
  tracking_uri: file:./mlruns
```

With that default value, a full DVC training run may write MLflow files directly to `./mlruns` instead of the running MLflow server at port `5000`. For a demo where the result must appear immediately in the MLflow web UI, use the smoke-test command above, or change `params.yaml` to:

```yaml
mlflow:
  tracking_uri: http://mlflow:5000
```

Use `http://mlflow:5000` only for training inside Docker Compose. If training from the host machine, use:

```yaml
mlflow:
  tracking_uri: http://127.0.0.1:5000
```

## 5. Prometheus On Port 9090

Open:

```text
http://127.0.0.1:9090
```

Health check:

```powershell
Invoke-RestMethod http://127.0.0.1:9090/-/healthy
```

Check whether Prometheus can scrape the API:

```powershell
Invoke-RestMethod "http://127.0.0.1:9090/api/v1/query?query=up"
```

Expected result includes:

```text
instance="api:8000"
job="api"
value=1
```

## 6. Grafana On Port 3000

Open:

```text
http://127.0.0.1:3000
```

Default login:

```text
admin / admin
```

Health check:

```powershell
Invoke-RestMethod http://127.0.0.1:3000/api/health
```

Grafana is used to visualize metrics collected by Prometheus, such as request counts, latency, errors, and drift alerts.

## 7. Dependency Notes

For the DeepSets pipeline, API, and baseline training scripts, the current requirements are sufficient:

- `services/inference_api/requirements.txt` contains API server dependencies.
- `services/inference_api/requirements-inference.txt` contains inference and training dependencies used by the DeepSets pipeline and CatBoost baseline scripts: `numpy`, `pandas`, `pyarrow`, `scikit-learn`, `torch`, `mlflow`, `dvc`, `dvc-gdrive`, and `catboost`.

No extra package is required for the documented smoke test after installing `services/inference_api/requirements-inference.txt`.

## 8. Quick End-To-End Check

```powershell
docker compose ps
Invoke-RestMethod http://127.0.0.1:8000/
Invoke-RestMethod http://127.0.0.1:8000/health

$body = @{
  cpm = 100.0
  hour_start = 720
  hour_end = 744
  publishers = @(1, 2, 3)
  audience_size = 1000
  user_ids = @(1, 2, 3, 4)
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/predict -ContentType "application/json" -Body $body
Invoke-RestMethod http://127.0.0.1:8000/predictions/recent
Invoke-RestMethod "http://127.0.0.1:9090/api/v1/query?query=up"
Invoke-RestMethod http://127.0.0.1:3000/api/health
```

If all commands return valid data, the API, model inference, Prometheus, and Grafana are working.
