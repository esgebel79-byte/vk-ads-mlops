from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from services.inference_api.app import main as api_main
from unittest.mock import patch
from pathlib import Path


@pytest.fixture
def client() -> TestClient:
    api_main.model_bundle = None
    return TestClient(api_main.app)


def test_health_still_works(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert "model_ready" in payload
    assert "model_loaded" in payload
    assert "artifacts" in payload


def test_metadata_works_when_artifacts_missing(client: TestClient) -> None:
# Имитируем, что функция проверки существования модели os.path.exists вернула False
    with patch.object(Path, "exists", return_value=False):
        response = client.get("/metadata")
        assert response.status_code == 200
        payload = response.json()
        assert payload["model_ready"] is False


def test_metadata_top_level_keys(client: TestClient) -> None:
    response = client.get("/metadata")
    assert response.status_code == 200
    payload = response.json()
    assert set(payload) == {
        "model_ready",
        "model_loaded",
        "model_version",
        "publisher_universe",
        "cpm",
        "time",
        "limits",
    }
    assert set(payload["cpm"]) == {
        "min",
        "max",
        "step",
        "median_competitor_cpm",
        "max_competitor_cpm",
        "source",
    }
    assert payload["cpm"]["source"] in {"artifact", "config", "unavailable"}
    assert set(payload["time"]) == {
        "mode",
        "min_hour",
        "max_hour",
        "recommended_presets",
        "session_silence_window_hours",
    }
    assert payload["time"]["mode"] == "absolute_hours"
    assert set(payload["limits"]) == {"max_sweep_points", "max_recent_predictions"}


def test_predict_sweep_rejects_invalid_cpm_range(client: TestClient) -> None:
    response = client.post(
        "/predict/sweep",
        json={
            "base_request": {
                "hour_start": 0,
                "hour_end": 24,
                "publishers": [],
                "audience_size": 1000,
                "user_ids": [],
            },
            "cpm_range": {"min": 60, "max": 5, "step": 5},
        },
    )
    assert response.status_code == 422


def test_predict_sweep_enforces_max_sweep_points(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(api_main.settings, "max_sweep_points", 3)
    response = client.post(
        "/predict/sweep",
        json={
            "base_request": {
                "hour_start": 0,
                "hour_end": 24,
                "publishers": [],
                "audience_size": 1000,
                "user_ids": [],
            },
            "cpm_range": {"min": 0, "max": 100, "step": 1},
        },
    )
    assert response.status_code == 422
    detail = response.json()["detail"]
    assert "MAX_SWEEP_POINTS" in detail or "exceeds" in detail.lower()


def test_predict_contract_unchanged(client: TestClient) -> None:
    schema = client.get("/openapi.json").json()
    predict_op = schema["paths"]["/predict"]["post"]
    response_schema = predict_op["responses"]["200"]["content"]["application/json"]["schema"]
    if "$ref" in response_schema:
        ref_name = response_schema["$ref"].split("/")[-1]
        response_schema = schema["components"]["schemas"][ref_name]

    assert set(response_schema["required"]) == {
        "at_least_one",
        "at_least_two",
        "at_least_three",
        "model_version",
        "drift_flag",
        "prediction_id",
    }
    assert set(response_schema["properties"]) == set(response_schema["required"])

    request_schema = predict_op["requestBody"]["content"]["application/json"]["schema"]
    if "$ref" in request_schema:
        ref_name = request_schema["$ref"].split("/")[-1]
        request_schema = schema["components"]["schemas"][ref_name]
    assert set(request_schema["required"]) == {
        "cpm",
        "hour_start",
        "hour_end",
        "audience_size",
    }


def test_metadata_cpm_config_source(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(api_main.settings, "cpm_median_competitor", 12.5)
    monkeypatch.setattr(api_main.settings, "cpm_max_competitor", 45.0)
    response = client.get("/metadata")
    assert response.status_code == 200
    cpm = response.json()["cpm"]
    assert cpm["source"] == "config"
    assert cpm["median_competitor_cpm"] == 12.5
    assert cpm["max_competitor_cpm"] == 45.0


def test_generate_sweep_cpms_respects_range() -> None:
    from services.inference_api.app.main import CpmRange, generate_sweep_cpms

    points = generate_sweep_cpms(CpmRange(min=5, max=15, step=5))
    assert points == [5.0, 10.0, 15.0]
