# Quick Start: Prometheus Integration

## Быстрый старт

### 1. Запуск сервисов через Docker Compose

```bash
cd c:\Users\Elena\Desktop\vk-ads-mlops
docker compose up --build
```

### 2. Доступ к метрикам

**Параметры сервисов:**
- API инференса: http://localhost:8000
- Prometheus метрики: http://localhost:8000/metrics
- Prometheus UI: http://localhost:9090
- Grafana: http://localhost:3000 (admin / admin)

### 3. Проверка сбора метрик

**Ping API:**
```bash
curl http://localhost:8000/health
```

**Посмотреть метрики Prometheus:**
```bash
curl http://localhost:8000/metrics
```

**Prometheus UI для PromQL запросов:**
Откройте http://localhost:9090/graph

**Grafana Dashboard:**
- Откройте http://localhost:3000
- Логин: admin, пароль: admin
- Автоматически загруженный dashboard: "VK Ads Inference Metrics"

## Файлы интеграции

### Основные файлы:
- [services/inference_api/app/metrics.py](services/inference_api/app/metrics.py) - Модуль метрик
- [services/inference_api/app/main.py](services/inference_api/app/main.py) - Обновленный main (импортирует и использует метрики)
- [deployments/monitoring/prometheus.yml](deployments/monitoring/prometheus.yml) - Конфигурация Prometheus
- [deployments/monitoring/grafana/provisioning/dashboards/inference_metrics.json](deployments/monitoring/grafana/provisioning/dashboards/inference_metrics.json) - Grafana Dashboard

### Документация:
- [PROMETHEUS_INTEGRATION.md](PROMETHEUS_INTEGRATION.md) - Подробная документация

## Ключевые метрики

| Метрика | Тип | Описание |
|---------|-----|---------|
| `inference_requests_total` | Counter | Всего запросов |
| `inference_requests_duration_seconds` | Histogram | Задержка запросов |
| `prediction_drift_alerts_total` | Counter | Дрифт-алерты |
| `inference_queue_size` | Gauge | Размер очереди |
| `model_loaded_status` | Gauge | Статус модели (1/0) |
| `model_mae` / `model_rmse` | Gauge | Метрики качества |

## Примеры PromQL запросов

### Запросить количество запросов в минуту:
```promql
rate(inference_requests_total[1m])
```

### 95-й квантиль задержки:
```promql
histogram_quantile(0.95, rate(inference_requests_duration_seconds_bucket[5m]))
```

### Процент ошибок:
```promql
rate(prediction_error_count[5m]) / rate(inference_requests_total[5m])
```

## Использование в коде

### Импорт метрик в main.py:
```python
from app.metrics import (
    init_metrics,
    record_drift_alert,
    set_model_loaded,
    set_recent_predictions_size,
    set_drift_window_size,
)

# Инициализация в app
app = FastAPI()
init_metrics(app)

# Использование
record_drift_alert()
set_model_loaded(True)
set_recent_predictions_size(len(recent_predictions))
```

## Troubleshooting

### Если метрики не собираются:
1. Проверьте что API работает: `curl http://localhost:8000/health`
2. Проверьте метрики через: `curl http://localhost:8000/metrics`
3. В Prometheus UI перейдите на http://localhost:9090/targets и проверьте статус scraper

### Если Grafana не загружает dashboard:
1. Перезагрузите Grafana: `docker compose restart grafana`
2. Проверьте логи: `docker compose logs grafana`
3. Убедитесь что datasource Prometheus добавлен в Grafana

### Если есть ошибки при запуске:
1. Пересоберите образы: `docker compose build --no-cache`
2. Удалите тома: `docker compose down -v`
3. Запустите заново: `docker compose up --build`
