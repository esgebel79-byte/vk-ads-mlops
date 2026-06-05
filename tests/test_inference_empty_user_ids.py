from __future__ import annotations

import math
from typing import Any
from unittest.mock import MagicMock

import numpy as np
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from services.inference_api.app import main as api_main
from services.inference_api.app.main import (
    CampaignRequest,
    CampaignWindowRequest,
    InferenceOutputError,
    calculate_predicted_reach,
    is_finite_number,
    sanitize_probability,
    select_inference_user_ids,
)


@pytest.fixture
def client() -> TestClient:
    api_main.model_bundle = None
    return TestClient(api_main.app)


@pytest.fixture
def user_id_sorted() -> np.ndarray:
    return np.array([1, 2, 3, 4, 5, 10, 20, 30, 40, 50], dtype=np.int64)


class TestNumericHelpers:
    def test_is_finite_number(self) -> None:
        assert is_finite_number(0.5) is True
        assert is_finite_number("0.25") is True
        assert is_finite_number(float("nan")) is False
        assert is_finite_number(float("inf")) is False
        assert is_finite_number(None) is False
        assert is_finite_number("not-a-number") is False

    def test_sanitize_probability_rejects_nan(self) -> None:
        with pytest.raises(InferenceOutputError, match="non-finite"):
            sanitize_probability(float("nan"), "at_least_one")

    def test_sanitize_probability_rejects_infinity(self) -> None:
        with pytest.raises(InferenceOutputError, match="non-finite"):
            sanitize_probability(float("inf"), "at_least_two")

    def test_sanitize_probability_clamps_out_of_range(self) -> None:
        assert sanitize_probability(-0.2, "at_least_one") == 0.0
        assert sanitize_probability(1.5, "at_least_one") == 1.0
        assert sanitize_probability(0.42, "at_least_one") == 0.42

    def test_calculate_predicted_reach_rejects_nan_before_int(self) -> None:
        with pytest.raises(InferenceOutputError):
            calculate_predicted_reach(1000, float("nan"))

    def test_calculate_predicted_reach_rounds_safely(self) -> None:
        assert calculate_predicted_reach(1000, 0.456) == 456


class TestSelectInferenceUserIds:
    def test_empty_user_ids_uses_deterministic_default_sample(
        self,
        user_id_sorted: np.ndarray,
    ) -> None:
        request = CampaignWindowRequest(
            hour_start=0,
            hour_end=24,
            publishers=[1],
            audience_size=1000,
            user_ids=[],
        )
        selected, source = select_inference_user_ids(request, user_id_sorted, 1000)
        assert source == "default_sample"
        assert selected == [1, 2, 3, 4, 5, 10, 20, 30, 40, 50]

    def test_empty_user_ids_respects_audience_size(
        self,
        user_id_sorted: np.ndarray,
    ) -> None:
        request = CampaignWindowRequest(
            hour_start=0,
            hour_end=24,
            publishers=[1],
            audience_size=3,
            user_ids=[],
        )
        selected, source = select_inference_user_ids(request, user_id_sorted, 1000)
        assert source == "default_sample"
        assert selected == [1, 2, 3]

    def test_empty_user_ids_respects_default_sample_size(
        self,
        user_id_sorted: np.ndarray,
    ) -> None:
        request = CampaignWindowRequest(
            hour_start=0,
            hour_end=24,
            publishers=[1],
            audience_size=1000,
            user_ids=[],
        )
        selected, source = select_inference_user_ids(request, user_id_sorted, 4)
        assert source == "default_sample"
        assert selected == [1, 2, 3, 4]

    def test_provided_user_ids_filters_to_known(self, user_id_sorted: np.ndarray) -> None:
        request = CampaignWindowRequest(
            hour_start=0,
            hour_end=24,
            publishers=[1],
            audience_size=1000,
            user_ids=[2, 99, 4, 100],
        )
        selected, source = select_inference_user_ids(request, user_id_sorted, 1000)
        assert source == "provided"
        assert selected == [2, 4]

    def test_unknown_user_ids_return_clean_error(self, user_id_sorted: np.ndarray) -> None:
        request = CampaignWindowRequest(
            hour_start=0,
            hour_end=24,
            publishers=[1],
            audience_size=1000,
            user_ids=[99, 100, 101],
        )
        with pytest.raises(HTTPException) as exc_info:
            select_inference_user_ids(request, user_id_sorted, 1000)
        assert exc_info.value.status_code == 422
        assert "None of the provided user IDs are available" in str(exc_info.value.detail)

    def test_no_available_users_raises_service_error(self) -> None:
        request = CampaignWindowRequest(
            hour_start=0,
            hour_end=24,
            publishers=[1],
            audience_size=1000,
            user_ids=[],
        )
        with pytest.raises(HTTPException) as exc_info:
            select_inference_user_ids(request, np.array([], dtype=np.int64), 1000)
        assert exc_info.value.status_code == 503


def _make_mock_bundle(
    user_id_sorted: np.ndarray | None = None,
    predict_return: dict[str, float] | None = None,
) -> MagicMock:
    bundle = MagicMock()
    bundle.user_id_sorted = user_id_sorted if user_id_sorted is not None else np.array([1, 2, 3], dtype=np.int64)
    bundle.cfg.default_inference_user_sample_size = 1000

    def _predict(
        request: CampaignRequest,
        selected_user_ids: list[int] | None = None,
    ) -> tuple[dict[str, float], bool, None]:
        assert selected_user_ids is not None
        assert len(selected_user_ids) > 0
        values = predict_return or {
            "at_least_one": 0.4,
            "at_least_two": 0.2,
            "at_least_three": 0.1,
        }
        return values, False, None

    bundle.predict.side_effect = _predict
    return bundle


class TestPredictEndpoint:
    def test_predict_with_empty_user_ids_returns_finite_probabilities(
        self,
        client: TestClient,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        mock_bundle = _make_mock_bundle()
        monkeypatch.setattr(api_main, "get_model_bundle", lambda force_reload=False: mock_bundle)

        response = client.post(
            "/predict",
            json={
                "cpm": 200,
                "hour_start": 0,
                "hour_end": 24,
                "publishers": [1, 2, 3],
                "audience_size": 1000,
                "user_ids": [],
            },
        )
        assert response.status_code == 200
        payload = response.json()
        for key in ("at_least_one", "at_least_two", "at_least_three"):
            assert payload[key] is not None
            assert math.isfinite(payload[key])
        mock_bundle.predict.assert_called_once()
        _, kwargs = mock_bundle.predict.call_args
        assert kwargs.get("selected_user_ids") or mock_bundle.predict.call_args[0][1]

    def test_predict_with_valid_user_ids_still_works(
        self,
        client: TestClient,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        user_ids = np.array([1, 2, 3, 4, 5], dtype=np.int64)
        mock_bundle = _make_mock_bundle(user_id_sorted=user_ids)
        monkeypatch.setattr(api_main, "get_model_bundle", lambda force_reload=False: mock_bundle)

        response = client.post(
            "/predict",
            json={
                "cpm": 200,
                "hour_start": 0,
                "hour_end": 24,
                "publishers": [1, 2, 3],
                "audience_size": 1000,
                "user_ids": [1, 2, 3],
            },
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["at_least_one"] == 0.4

    def test_predict_rejects_unknown_user_ids(
        self,
        client: TestClient,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        mock_bundle = _make_mock_bundle(user_id_sorted=np.array([1, 2, 3], dtype=np.int64))
        monkeypatch.setattr(api_main, "get_model_bundle", lambda force_reload=False: mock_bundle)

        response = client.post(
            "/predict",
            json={
                "cpm": 200,
                "hour_start": 0,
                "hour_end": 24,
                "publishers": [1],
                "audience_size": 1000,
                "user_ids": [99, 100],
            },
        )
        assert response.status_code == 422
        assert "None of the provided user IDs are available" in response.json()["detail"]
        mock_bundle.predict.assert_not_called()

    def test_predict_rejects_non_finite_model_output(
        self,
        client: TestClient,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        mock_bundle = _make_mock_bundle(
            predict_return={
                "at_least_one": float("nan"),
                "at_least_two": 0.2,
                "at_least_three": 0.1,
            }
        )
        monkeypatch.setattr(api_main, "get_model_bundle", lambda force_reload=False: mock_bundle)

        response = client.post(
            "/predict",
            json={
                "cpm": 200,
                "hour_start": 0,
                "hour_end": 24,
                "publishers": [1],
                "audience_size": 1000,
                "user_ids": [1],
            },
        )
        assert response.status_code == 500
        assert "non-finite" in response.json()["detail"].lower()


class TestPredictSweepEndpoint:
    def test_sweep_with_empty_user_ids_does_not_crash_on_nan_int(
        self,
        client: TestClient,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        mock_bundle = _make_mock_bundle()
        monkeypatch.setattr(api_main, "get_model_bundle", lambda force_reload=False: mock_bundle)

        response = client.post(
            "/predict/sweep",
            json={
                "base_request": {
                    "hour_start": 0,
                    "hour_end": 24,
                    "publishers": [1, 2, 3],
                    "audience_size": 1000,
                    "user_ids": [],
                },
                "cpm_range": {"min": 30, "max": 50, "step": 10},
            },
        )
        assert response.status_code == 200
        payload = response.json()
        assert set(payload) >= {"sweep_id", "points", "model_version", "latency_seconds"}
        assert len(payload["points"]) == 3
        for point in payload["points"]:
            assert math.isfinite(point["at_least_one"])
            assert isinstance(point["predicted_reach"], int)

    def test_sweep_skips_non_finite_points_and_adds_warnings(
        self,
        client: TestClient,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        call_count = {"n": 0}

        def _predict_with_nan(
            request: CampaignRequest,
            selected_user_ids: list[int] | None = None,
        ) -> tuple[dict[str, float], bool, None]:
            call_count["n"] += 1
            if request.cpm == 30.0:
                return {
                    "at_least_one": float("nan"),
                    "at_least_two": 0.2,
                    "at_least_three": 0.1,
                }, False, None
            return {
                "at_least_one": 0.4,
                "at_least_two": 0.2,
                "at_least_three": 0.1,
            }, False, None

        mock_bundle = _make_mock_bundle()
        mock_bundle.predict.side_effect = _predict_with_nan
        monkeypatch.setattr(api_main, "get_model_bundle", lambda force_reload=False: mock_bundle)

        response = client.post(
            "/predict/sweep",
            json={
                "base_request": {
                    "hour_start": 0,
                    "hour_end": 24,
                    "publishers": [1],
                    "audience_size": 1000,
                    "user_ids": [],
                },
                "cpm_range": {"min": 30, "max": 50, "step": 10},
            },
        )
        assert response.status_code == 200
        payload = response.json()
        assert len(payload["points"]) == 2
        assert payload["warnings"] == [
            "Skipped CPM 30.0 because the model returned non-finite prediction values."
        ]

    def test_sweep_fails_cleanly_when_all_points_non_finite(
        self,
        client: TestClient,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        mock_bundle = _make_mock_bundle(
            predict_return={
                "at_least_one": float("nan"),
                "at_least_two": float("nan"),
                "at_least_three": float("nan"),
            }
        )
        monkeypatch.setattr(api_main, "get_model_bundle", lambda force_reload=False: mock_bundle)

        response = client.post(
            "/predict/sweep",
            json={
                "base_request": {
                    "hour_start": 0,
                    "hour_end": 24,
                    "publishers": [1],
                    "audience_size": 1000,
                    "user_ids": [],
                },
                "cpm_range": {"min": 30, "max": 40, "step": 10},
            },
        )
        assert response.status_code == 500
        detail = response.json()["detail"]
        assert "non-finite predictions for all sweep points" in detail
        assert "cannot convert float NaN to integer" not in detail

    def test_sweep_response_schema_backward_compatible(
        self,
        client: TestClient,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        mock_bundle = _make_mock_bundle()
        monkeypatch.setattr(api_main, "get_model_bundle", lambda force_reload=False: mock_bundle)

        response = client.post(
            "/predict/sweep",
            json={
                "base_request": {
                    "hour_start": 0,
                    "hour_end": 24,
                    "publishers": [1],
                    "audience_size": 100,
                    "user_ids": [],
                },
                "cpm_range": {"min": 10, "max": 10, "step": 5},
            },
        )
        assert response.status_code == 200
        payload = response.json()
        assert isinstance(payload["sweep_id"], str)
        assert isinstance(payload["points"], list)
        assert isinstance(payload["model_version"], str)
        assert isinstance(payload["latency_seconds"], (int, float))
        assert "warnings" in payload
        assert isinstance(payload["warnings"], list)
