"""Prometheus metrics integration for FastAPI inference service."""

from typing import Callable

import time
from fastapi import FastAPI, Request
from fastapi.responses import Response
from prometheus_client import (
    Counter,
    Gauge,
    Histogram,
    CONTENT_TYPE_LATEST,
    generate_latest,
)

# ============================================================================
# METRICS DEFINITIONS
# ============================================================================

inference_requests_total = Counter(
    "inference_requests_total",
    "Total number of inference requests",
    ["endpoint", "status"],
)

inference_requests_duration_seconds = Histogram(
    "inference_requests_duration_seconds",
    "Inference request duration in seconds",
    ["endpoint"],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0),
)

prediction_error_count = Counter(
    "prediction_error_count",
    "Total number of prediction errors",
)

prediction_drift_alerts_total = Counter(
    "prediction_drift_alerts_total",
    "Total number of drift alerts detected in predictions",
)

sweep_request_count = Counter(
    "sweep_request_count",
    "Total number of sweep requests",
)

sweep_error_count = Counter(
    "sweep_error_count",
    "Total number of sweep errors",
)

sweep_latency_seconds = Histogram(
    "sweep_latency_seconds",
    "Sweep request latency in seconds",
    buckets=(0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0),
)

retrain_trigger_count = Counter(
    "retrain_trigger_count",
    "Total number of retrain trigger attempts",
)

inference_queue_size = Gauge(
    "inference_queue_size",
    "Current size of inference request queue",
)

model_loaded_status = Gauge(
    "model_loaded_status",
    "Model loading status (1 = loaded, 0 = not loaded)",
)

recent_predictions_buffer_size = Gauge(
    "recent_predictions_buffer_size",
    "Current size of recent predictions buffer",
)

drift_detection_window_size = Gauge(
    "drift_detection_window_size",
    "Current size of drift detection feature window",
)

model_mae = Gauge(
    "model_mae",
    "Latest model validation mean MAE",
)

model_rmse = Gauge(
    "model_rmse",
    "Latest model validation mean RMSE",
)


# ============================================================================
# INITIALIZATION FUNCTION
# ============================================================================


def init_metrics(app: FastAPI) -> None:
    """
    Initialize Prometheus metrics endpoint in FastAPI application.

    Registers the /metrics endpoint and adds middleware to track request metrics.

    Args:
        app: FastAPI application instance
    """

    @app.get("/metrics", include_in_schema=False)
    def metrics_endpoint() -> Response:
        """Prometheus metrics endpoint."""
        return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

    @app.middleware("http")
    async def metrics_middleware(request: Request, call_next: Callable) -> Response:
        """
        Middleware to automatically collect metrics for all HTTP requests.

        Tracks request count, latency, and response status for inference endpoints.
        """
        start_time = time.perf_counter()
        status_code = 500

        try:
            response = await call_next(request)
            status_code = response.status_code
        except Exception:
            status_code = 500
            raise
        finally:
            # Calculate request duration
            duration = time.perf_counter() - start_time

            # Record metrics for prediction endpoints
            if request.url.path in ["/predict", "/predict/sweep"]:
                endpoint_name = request.url.path.replace("/", "").replace("sweep", "sweep")
                inference_requests_total.labels(
                    endpoint=request.url.path, status=status_code
                ).inc()
                inference_requests_duration_seconds.labels(endpoint=request.url.path).observe(
                    duration
                )

        return response


# ============================================================================
# HELPER FUNCTIONS FOR METRICS UPDATES
# ============================================================================


def record_drift_alert() -> None:
    """Record occurrence of a data drift alert."""
    prediction_drift_alerts_total.inc()


def set_queue_size(size: int) -> None:
    """
    Update the current inference queue size.

    Args:
        size: Current number of pending inference requests
    """
    inference_queue_size.set(size)


def set_model_loaded(loaded: bool) -> None:
    """
    Update model loading status.

    Args:
        loaded: True if model is loaded and ready, False otherwise
    """
    model_loaded_status.set(1 if loaded else 0)


def set_recent_predictions_size(size: int) -> None:
    """
    Update recent predictions buffer size.

    Args:
        size: Current number of recent predictions stored
    """
    recent_predictions_buffer_size.set(size)


def set_drift_window_size(size: int) -> None:
    """
    Update drift detection feature window size.

    Args:
        size: Current number of feature samples in drift detection window
    """
    drift_detection_window_size.set(size)


def set_model_mae(value: float) -> None:
    """
    Update model mean absolute error metric.

    Args:
        value: Latest mean absolute error value
    """
    model_mae.set(value)


def set_model_rmse(value: float) -> None:
    """
    Update model root mean squared error metric.

    Args:
        value: Latest root mean squared error value
    """
    model_rmse.set(value)
