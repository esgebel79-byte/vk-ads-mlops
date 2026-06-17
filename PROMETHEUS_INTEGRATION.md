# Prometheus Integration для VK Ads Inference API

## Обзор

Интеграция Prometheus для сбора и отправки метрик из FastAPI приложения инференса VK Ads. Включает автоматическое отслеживание запросов, задержек, ошибок и специфичных метрик моделей.

## Структура

### Файлы:
- **`services/inference_api/app/metrics.py`** - Модуль с определениями Prometheus метрик и middleware
- **`services/inference_api/app/main.py`** - Основной FastAPI app (обновлён для использования метрик)
- **`deployments/monitoring/prometheus.yml`** - Конфигурация Prometheus scraper
- **`deployments/monitoring/grafana/provisioning/dashboards/inference_metrics.json`** - Grafana dashboard

## Метрики

### Счётчики (Counter)

| Метрика | Описание |
|---------|---------|
| `inference_requests_total` | Общее количество запросов на инференс (с метками endpoint и status) |
| `prediction_error_count` | Количество ошибок при предсказании |
| `prediction_drift_alerts_total` | Количество срабатываний дрифт-алертов |
| `sweep_request_count` | Количество успешных CPM sweep запросов |
| `sweep_error_count` | Количество ошибок в sweep запросах |
| `retrain_trigger_count` | Количество попыток запуска переобучения |

### Гистограммы (Histogram)

| Метрика | Описание |
|---------|---------|
| `inference_requests_duration_seconds` | Длительность запросов инференса (с метками по endpoint) |
| `sweep_latency_seconds` | Длительность CPM sweep запросов |

### Датчики (Gauge)

| Метрика | Описание |
|---------|---------|
| `inference_queue_size` | Текущий размер очереди запросов |
| `model_loaded_status` | Статус модели (1 = загружена, 0 = не загружена) |
| `recent_predictions_buffer_size` | Размер буффера недавних предсказаний |
| `drift_detection_window_size` | Размер окна для дрифт-детекции |
| `model_mae` | Mean Absolute Error модели из отчёта валидации |
| `model_rmse` | Root Mean Squared Error модели из отчёта валидации |

## Использование

### 1. Автоматическое отслеживание запросов

Middleware автоматически собирает метрики для всех запросов к `/predict` и `/predict/sweep`:

```python
from app.metrics import init_metrics
from fastapi import FastAPI

app = FastAPI()
init_metrics(app)  # Добавляет /metrics endpoint и middleware
```

### 2. Запись метрик из кода

```python
from app.metrics import (
    record_drift_alert,
    set_queue_size,
    set_model_loaded,
    set_recent_predictions_size,
    set_drift_window_size,
)

# Записать дрифт-алерт
record_drift_alert()

# Обновить размер очереди
set_queue_size(len(request_queue))

# Обновить статус модели при загрузке
set_model_loaded(True)

# Обновить размер буффера предсказаний
set_recent_predictions_size(len(recent_predictions))

# Обновить размер окна дрифт-детекции
set_drift_window_size(len(drift_window))
```

### 3. Доступ к метрикам

**Prometheus эндпоинт:**
```
http://localhost:8000/metrics
```

Возвращает метрики в формате Prometheus text format.

## Docker Compose

### Запуск сервисов:

```bash
docker compose up --build
```

### Доступ к интерфейсам:

| Сервис | URL |
|--------|-----|
| API Инференса | `http://localhost:8000` |
| API /metrics | `http://localhost:8000/metrics` |
| Prometheus | `http://localhost:9090` |
| Grafana | `http://localhost:3000` (admin/admin) |

## Grafana Dashboard

Dashboard `VK Ads Inference Metrics` автоматически загружается и включает:

- **Inference Requests Rate** - Частота запросов по типам (request rate за 1 минуту)
- **Inference Latency** - p95 и p99 квантили задержки запросов
- **Current Queue Size** - Текущий размер очереди
- **Model Loaded Status** - Статус загрузки модели
- **Drift Alerts** - Количество дрифт-алертов за 5 минут
- **Error Rate** - Частота ошибок за 5 минут
- **Model MAE** - Mean Absolute Error модели
- **Model RMSE** - Root Mean Squared Error модели

## Prometheus Queries

Примеры полезных PromQL запросов:

```promql
# Успешные и ошибочные запросы за последнюю минуту
rate(inference_requests_total[1m])

# Среднее время ответа
rate(inference_requests_duration_seconds_sum[5m]) / rate(inference_requests_duration_seconds_count[5m])

# 95-й квантиль задержки
histogram_quantile(0.95, rate(inference_requests_duration_seconds_bucket[5m]))

# Процент ошибок
rate(prediction_error_count[5m]) / rate(inference_requests_total{status=~"5.."}[5m])

# Количество дрифт-алертов
increase(prediction_drift_alerts_total[1h])

# Средний размер очереди за последний час
avg_over_time(inference_queue_size[1h])
```

## Имплементация в main.py

Основные изменения в `main.py`:

1. **Импорт метрик:**
```python
from app.metrics import (
    init_metrics,
    record_drift_alert,
    set_model_loaded,
    set_queue_size,
    set_drift_window_size,
    set_recent_predictions_size,
    # ... остальные импорты
)
```

2. **Инициализация после создания app:**
```python
app = FastAPI(title="VK Ads Reach Prediction API", version="0.1.0")
# ... add_middleware ...
init_metrics(app)  # Инициализировать метрики
```

3. **Использование в обработчиках:**
```python
@app.post("/predict")
def predict(request: CampaignRequest) -> PredictionResponse:
    # ... predict logic ...
    if drift_flag:
        record_drift_alert()  # Вместо drift_alert_count.inc()
    
    # Обновить метрики в finally блоке
    finally:
        set_recent_predictions_size(len(recent_predictions))
        set_drift_window_size(len(recent_feature_rows))
```

## Файл metrics.py

Полностью готовый к использованию модуль с:
- Определениями всех Prometheus метрик
- Функцией инициализации `init_metrics(app)`
- Middleware для автоматического сбора метрик
- Вспомогательными функциями для обновления метрик

**Все функции полностью реализованы без заглушек (pass/TODO).**

## Примечания

- Middleware автоматически отслеживает запросы с меткой по endpoint и status code
- Для /predict и /predict/sweep используются отдельные гистограммы (/sweep используется sweep_latency_seconds)
- Все метрики автоматически экспортируются через эндпоинт /metrics
- Grafana dashboard использует эти метрики для визуализации
- Prometheus scraper автоматически собирает метрики каждые 15 секунд (настраивается в prometheus.yml)
