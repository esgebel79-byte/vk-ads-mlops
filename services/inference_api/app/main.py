from __future__ import annotations

import hashlib
import json
import os
import subprocess
import sys
import time
from collections import deque
from datetime import datetime, timezone
from pathlib import Path
from typing import TYPE_CHECKING, Any, Literal, TypeAlias
from uuid import uuid4

from fastapi import BackgroundTasks, FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Gauge, Histogram, generate_latest
from pydantic import BaseModel, Field, model_validator

if TYPE_CHECKING:
    import numpy as _np_types
    import pandas as _pd_types

    NumpyArray: TypeAlias = _np_types.ndarray[Any, Any]
    DataFrame: TypeAlias = _pd_types.DataFrame
else:
    NumpyArray: TypeAlias = Any
    DataFrame: TypeAlias = Any

PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

DEFAULT_STAGE10_DIR = PROJECT_ROOT / "data" / "processed" / "stage10"
DEFAULT_MODEL_PATH = PROJECT_ROOT / "models" / "deepsets" / "deepsets_attn.pt"
DEFAULT_REPORT_PATH = PROJECT_ROOT / "models" / "deepsets" / "report_stage13.json"
TARGET_NAMES = ["at_least_one", "at_least_two", "at_least_three"]
DEFAULT_CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
]
DEFAULT_TIME_PRESETS = [6, 12, 24, 48, 72, 168]

np: Any = None
pd: Any = None
torch: Any = None
build_campaign_features: Any = None
sample_user_indices_for_row: Any = None
data_drift_report: Any = None
save_drift_report: Any = None
HeavyDeepSets: Any = None
clip_monotone_np: Any = None
make_mask_and_gather: Any = None
norm_apply: Any = None


class InferenceDependencyError(RuntimeError):
    pass


def load_inference_dependencies() -> None:
    global np, pd, torch
    global TARGET_NAMES, HeavyDeepSets, clip_monotone_np, make_mask_and_gather, norm_apply
    global build_campaign_features, sample_user_indices_for_row
    global data_drift_report, save_drift_report

    if np is not None and pd is not None and torch is not None:
        return

    try:
        import numpy as _np
        import pandas as _pd
        import torch as _torch

        from src.features.prepare_deepsets_dataset import (
            build_campaign_features as _build_campaign_features,
            sample_user_indices_for_row as _sample_user_indices_for_row,
        )
        from src.monitoring.drift import (
            data_drift_report as _data_drift_report,
            save_drift_report as _save_drift_report,
        )
        from src.models.train_deepsets_attention import (
            TARGET_NAMES as _TARGET_NAMES,
            HeavyDeepSets as _HeavyDeepSets,
            clip_monotone_np as _clip_monotone_np,
            make_mask_and_gather as _make_mask_and_gather,
            norm_apply as _norm_apply,
        )
    except ImportError as exc:
        raise InferenceDependencyError(
            "Inference dependencies are not installed. Install "
            "services/inference_api/requirements-inference.txt or build the Docker image "
            "with INSTALL_INFERENCE_DEPS=true."
        ) from exc

    np = _np
    pd = _pd
    torch = _torch
    TARGET_NAMES = list(_TARGET_NAMES)
    HeavyDeepSets = _HeavyDeepSets
    clip_monotone_np = _clip_monotone_np
    make_mask_and_gather = _make_mask_and_gather
    norm_apply = _norm_apply
    build_campaign_features = _build_campaign_features
    sample_user_indices_for_row = _sample_user_indices_for_row
    data_drift_report = _data_drift_report
    save_drift_report = _save_drift_report


class Settings(BaseModel):
    model_path: Path = Field(default=DEFAULT_MODEL_PATH)
    stage10_dir: Path = Field(default=DEFAULT_STAGE10_DIR)
    report_path: Path = Field(default=DEFAULT_REPORT_PATH)
    device: str = "cpu"
    model_version: str = "deepsets_attention"
    seed: int = 42
    max_recent_predictions: int = 100
    max_sweep_points: int = 50
    drift_threshold: float = 0.2
    drift_window_size: int = 100
    drift_min_batch: int = 20
    drift_reports_dir: Path = Field(default=PROJECT_ROOT / "reports" / "drift")
    enable_retrain: bool = False
    retrain_command: str = "python -m dvc repro stage5_train_model"
    cors_allow_origins: list[str] = Field(default_factory=lambda: list(DEFAULT_CORS_ORIGINS))
    cpm_min: float = 0.0
    cpm_max: float = 100.0
    cpm_step: float = 5.0
    cpm_median_competitor: float | None = None
    cpm_max_competitor: float | None = None
    time_min_hour: int = 0
    time_max_hour: int = 168
    session_silence_window_hours: float = 4.0


class CampaignWindowRequest(BaseModel):
    hour_start: int
    hour_end: int
    publishers: list[int] = Field(default_factory=list)
    audience_size: int = Field(..., ge=0)
    user_ids: list[int] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_window(self) -> "CampaignWindowRequest":
        if self.hour_end < self.hour_start:
            raise ValueError("hour_end must be greater than or equal to hour_start")
        if self.audience_size and self.user_ids and self.audience_size < len(self.user_ids):
            raise ValueError("audience_size must be greater than or equal to len(user_ids)")
        return self


class CampaignRequest(CampaignWindowRequest):
    cpm: float = Field(..., ge=0.0)


class PredictionResponse(BaseModel):
    at_least_one: float
    at_least_two: float
    at_least_three: float
    model_version: str
    drift_flag: bool
    prediction_id: str


class CpmRange(BaseModel):
    min: float = Field(..., ge=0.0)
    max: float = Field(..., ge=0.0)
    step: float = Field(..., gt=0.0)

    @model_validator(mode="after")
    def validate_range(self) -> "CpmRange":
        if self.max < self.min:
            raise ValueError("cpm_range.max must be greater than or equal to cpm_range.min")
        return self


class SweepRequest(BaseModel):
    base_request: CampaignWindowRequest
    cpm_range: CpmRange


class SweepPoint(BaseModel):
    cpm: float
    at_least_one: float
    at_least_two: float
    at_least_three: float
    predicted_reach: int
    drift_flag: bool


class SweepResponse(BaseModel):
    sweep_id: str
    points: list[SweepPoint]
    model_version: str
    latency_seconds: float


class CpmMetadata(BaseModel):
    min: float
    max: float
    step: float
    median_competitor_cpm: float | None
    max_competitor_cpm: float | None
    source: Literal["artifact", "config", "unavailable"]


class TimeMetadata(BaseModel):
    mode: Literal["absolute_hours"] = "absolute_hours"
    min_hour: int
    max_hour: int
    recommended_presets: list[int]
    session_silence_window_hours: float


class LimitsMetadata(BaseModel):
    max_sweep_points: int
    max_recent_predictions: int


class MetadataResponse(BaseModel):
    model_ready: bool
    model_loaded: bool
    model_version: str
    publisher_universe: list[int]
    cpm: CpmMetadata
    time: TimeMetadata
    limits: LimitsMetadata


prediction_count = Counter("prediction_count", "Total number of prediction requests")
prediction_latency_seconds = Histogram(
    "prediction_latency_seconds",
    "Prediction latency in seconds",
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0),
)
prediction_error_count = Counter("prediction_error_count", "Total number of prediction errors")
drift_alert_count = Counter("drift_alert_count", "Total number of drift alerts")
retrain_trigger_count = Counter("retrain_trigger_count", "Total number of retrain trigger attempts")
model_mae = Gauge("model_mae", "Latest model validation mean MAE")
model_rmse = Gauge("model_rmse", "Latest model validation mean RMSE")

def parse_cors_origins(raw: str | None) -> list[str]:
    if raw is None:
        return list(DEFAULT_CORS_ORIGINS)
    value = raw.strip()
    if not value:
        return list(DEFAULT_CORS_ORIGINS)
    if value == "*":
        return ["*"]
    return [origin.strip() for origin in value.split(",") if origin.strip()]


def parse_optional_float(raw: str | None) -> float | None:
    if raw is None or not raw.strip():
        return None
    return float(raw)


app = FastAPI(title="VK Ads Reach Prediction API", version="0.1.0")
settings = Settings(
    model_path=Path(os.getenv("MODEL_PATH", str(DEFAULT_MODEL_PATH))),
    stage10_dir=Path(os.getenv("STAGE10_DIR", str(DEFAULT_STAGE10_DIR))),
    report_path=Path(os.getenv("MODEL_REPORT_PATH", str(DEFAULT_REPORT_PATH))),
    device=os.getenv("MODEL_DEVICE", "cpu"),
    seed=int(os.getenv("PREDICT_SEED", "42")),
    max_recent_predictions=int(os.getenv("MAX_RECENT_PREDICTIONS", "100")),
    max_sweep_points=int(os.getenv("MAX_SWEEP_POINTS", "50")),
    drift_threshold=float(os.getenv("DRIFT_THRESHOLD", "0.2")),
    drift_window_size=int(os.getenv("DRIFT_WINDOW_SIZE", "100")),
    drift_min_batch=int(os.getenv("DRIFT_MIN_BATCH", "20")),
    drift_reports_dir=Path(os.getenv("DRIFT_REPORTS_DIR", str(PROJECT_ROOT / "reports" / "drift"))),
    enable_retrain=os.getenv("ENABLE_RETRAIN", "false").lower() in {"1", "true", "yes"},
    retrain_command=os.getenv("RETRAIN_COMMAND", "python -m dvc repro stage5_train_model"),
    cors_allow_origins=parse_cors_origins(os.getenv("CORS_ALLOW_ORIGINS")),
    cpm_min=float(os.getenv("CPM_MIN", "0")),
    cpm_max=float(os.getenv("CPM_MAX", "100")),
    cpm_step=float(os.getenv("CPM_STEP", "5")),
    cpm_median_competitor=parse_optional_float(os.getenv("CPM_MEDIAN_COMPETITOR")),
    cpm_max_competitor=parse_optional_float(os.getenv("CPM_MAX_COMPETITOR")),
    time_min_hour=int(os.getenv("TIME_MIN_HOUR", "0")),
    time_max_hour=int(os.getenv("TIME_MAX_HOUR", "168")),
    session_silence_window_hours=float(os.getenv("SESSION_SILENCE_WINDOW_HOURS", "4")),
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
recent_predictions: deque[dict[str, Any]] = deque(maxlen=settings.max_recent_predictions)
recent_feature_rows: deque[dict[str, float]] = deque(maxlen=settings.drift_window_size)
model_bundle: "ModelBundle | None" = None


class ModelBundle:
    def __init__(self, cfg: Settings):
        load_inference_dependencies()
        self.cfg = cfg
        self.device = torch.device(cfg.device)
        self.stage10_dir = cfg.stage10_dir
        self.model_path = cfg.model_path
        self.user_id_sorted = self._load_array("user_id_sorted.npy").astype(np.int64)
        self.user_feat = self._load_array("user_feat.npy").astype(np.float32)
        self.pub_universe = self._load_pub_universe()
        self.pub_universe_set = set(int(x) for x in self.pub_universe)
        self.campaign_feature_columns = self._load_campaign_feature_columns()
        self.reference_campaign_features = self._load_reference_campaign_features()
        self.checkpoint = self._load_checkpoint()
        self.k = int(self.checkpoint.get("k", 0))
        if self.k <= 0:
            raise RuntimeError("Checkpoint does not contain a valid K value")

        self.user_feat_n = norm_apply(
            self.user_feat,
            self.checkpoint["user_mean"],
            self.checkpoint["user_std"],
        )
        self.user_table = torch.from_numpy(self.user_feat_n).to(self.device)
        self.model = HeavyDeepSets(
            user_dim=int(self.checkpoint.get("user_dim", self.user_feat.shape[1])),
            camp_dim=int(self.checkpoint["camp_dim"]),
        ).to(self.device)
        self.model.load_state_dict(self.checkpoint["state_dict"])
        self.model.eval()
        self._load_report_metrics()

    def _load_array(self, filename: str) -> NumpyArray:
        path = self.stage10_dir / filename
        if not path.exists():
            raise FileNotFoundError(f"Missing required artifact: {path}")
        return np.load(path)

    def _load_pub_universe(self) -> list[int]:
        path = self.stage10_dir / "pub_universe.npy"
        if not path.exists():
            raise FileNotFoundError(
                f"Missing required artifact: {path}. Run dvc repro stage4_prepare_deepsets."
            )
        return [int(x) for x in np.load(path).tolist()]

    def _load_campaign_feature_columns(self) -> list[str] | None:
        path = self.stage10_dir / "campaign_feature_columns.json"
        if not path.exists():
            return None
        with open(path, "r", encoding="utf-8") as f:
            return [str(x) for x in json.load(f)]

    def _load_reference_campaign_features(self) -> DataFrame | None:
        path = self.stage10_dir / "offline_campaign_feat.npy"
        if not path.exists() or self.campaign_feature_columns is None:
            return None
        arr = np.load(path).astype(np.float32)
        if arr.ndim != 2 or arr.shape[1] != len(self.campaign_feature_columns):
            return None
        return pd.DataFrame(arr, columns=self.campaign_feature_columns)

    def _load_checkpoint(self) -> dict[str, Any]:
        if not self.model_path.exists():
            raise FileNotFoundError(f"Missing model checkpoint: {self.model_path}")
        try:
            return torch.load(self.model_path, map_location=self.device, weights_only=False)
        except TypeError:
            return torch.load(self.model_path, map_location=self.device)

    def _load_report_metrics(self) -> None:
        if not self.cfg.report_path.exists():
            return
        with open(self.cfg.report_path, "r", encoding="utf-8") as f:
            report = json.load(f)
        overall = report.get("validate_metrics", {}).get("overall", {})
        if "mean_MAE" in overall:
            model_mae.set(float(overall["mean_MAE"]))
        if "mean_RMSE" in overall:
            model_rmse.set(float(overall["mean_RMSE"]))

    def predict(self, request: CampaignRequest) -> tuple[dict[str, float], bool, dict[str, Any] | None]:
        publishers = [int(x) for x in request.publishers]
        user_ids = [int(x) for x in request.user_ids]
        publishers_str = ",".join(str(x) for x in publishers)
        user_ids_str = ",".join(str(x) for x in user_ids)
        drift_flag = any(int(p) not in self.pub_universe_set for p in publishers)

        campaign_df = pd.DataFrame(
            [
                {
                    "cpm": float(request.cpm),
                    "hour_start": int(request.hour_start),
                    "hour_end": int(request.hour_end),
                    "publishers": publishers_str,
                    "audience_size": int(request.audience_size),
                    "user_ids": user_ids_str,
                }
            ]
        )
        campaign_features_df = build_campaign_features(campaign_df, self.pub_universe)
        data_drift = evaluate_data_drift(self, campaign_features_df)
        campaign_feat = campaign_features_df.to_numpy(np.float32)
        campaign_feat = norm_apply(
            campaign_feat,
            self.checkpoint["camp_mean"],
            self.checkpoint["camp_std"],
        )

        sample_seed = stable_seed(user_ids_str, self.cfg.seed)
        rng = np.random.default_rng(sample_seed)
        user_idx = sample_user_indices_for_row(user_ids_str, self.k, rng, self.user_id_sorted)

        with torch.no_grad():
            camp_x = torch.from_numpy(campaign_feat).to(self.device)
            ui = torch.from_numpy(user_idx.reshape(1, -1).astype(np.int64)).to(self.device)
            user_x, mask = make_mask_and_gather(ui, self.user_table)
            pred = self.model(user_x, camp_x, mask=mask).float().cpu().numpy().astype(np.float64)

        pred = clip_monotone_np(pred)[0]
        values = {name: float(pred[i]) for i, name in enumerate(TARGET_NAMES)}
        combined_drift = drift_flag or bool(data_drift and data_drift.get("drift_flag"))
        return values, combined_drift, data_drift


@app.get("/")
def root() -> dict[str, str]:
    return {
        "service": "vk-ads-reach-prediction-api",
        "health": "/health",
        "metadata": "/metadata",
        "docs": "/docs",
        "metrics": "/metrics",
    }


def stable_seed(value: str, seed: int) -> int:
    payload = f"{seed}:{value}".encode("utf-8")
    return int.from_bytes(hashlib.blake2b(payload, digest_size=4).digest(), "little")


def get_model_bundle(force_reload: bool = False) -> ModelBundle:
    global model_bundle
    if model_bundle is None or force_reload:
        missing = [
            item["path"]
            for item in model_artifact_status().values()
            if not item["exists"]
        ]
        if missing:
            raise FileNotFoundError("Missing required artifacts: " + ", ".join(missing))
        model_bundle = ModelBundle(settings)
    return model_bundle


def evaluate_data_drift(
    bundle: ModelBundle,
    campaign_features_df: DataFrame,
) -> dict[str, Any] | None:
    row = {
        str(col): float(campaign_features_df.iloc[0][col])
        for col in campaign_features_df.columns
        if pd.api.types.is_numeric_dtype(campaign_features_df[col])
    }
    recent_feature_rows.append(row)

    if bundle.reference_campaign_features is None:
        return None
    if len(recent_feature_rows) < settings.drift_min_batch:
        return None

    current = pd.DataFrame(list(recent_feature_rows))
    feature_columns = [
        col
        for col in bundle.reference_campaign_features.columns
        if col in current.columns
    ]
    report = data_drift_report(
        bundle.reference_campaign_features,
        current,
        feature_columns=feature_columns,
        threshold=settings.drift_threshold,
    )
    if report["drift_flag"]:
        path = save_drift_report(report, settings.drift_reports_dir)
        report["report_path"] = str(path)
    return report


def model_artifact_status() -> dict[str, Any]:
    required = {
        "model_path": settings.model_path,
        "stage10_dir": settings.stage10_dir,
        "user_feat": settings.stage10_dir / "user_feat.npy",
        "user_id_sorted": settings.stage10_dir / "user_id_sorted.npy",
        "pub_universe": settings.stage10_dir / "pub_universe.npy",
    }
    return {name: {"path": str(path), "exists": path.exists()} for name, path in required.items()}


def load_publisher_universe_metadata() -> list[int]:
    path = settings.stage10_dir / "pub_universe.npy"
    if not path.exists():
        return []
    try:
        if np is None:
            import numpy as _np

            values = _np.load(path)
        else:
            values = np.load(path)
        return [int(x) for x in values.tolist()]
    except Exception:
        return []


def load_reference_cpm_values() -> NumpyArray | None:
    columns_path = settings.stage10_dir / "campaign_feature_columns.json"
    features_path = settings.stage10_dir / "offline_campaign_feat.npy"
    if not columns_path.exists() or not features_path.exists():
        return None
    try:
        with open(columns_path, "r", encoding="utf-8") as f:
            columns = [str(x) for x in json.load(f)]
        if "cpm" not in columns:
            return None
        cpm_index = columns.index("cpm")
        if np is None:
            import numpy as _np

            arr = _np.load(features_path)
            values = arr[:, cpm_index].astype(_np.float64)
            values = values[_np.isfinite(values)]
        else:
            arr = np.load(features_path)
            values = arr[:, cpm_index].astype(np.float64)
            values = values[np.isfinite(values)]
        if values.size == 0:
            return None
        return values
    except Exception:
        return None


def build_cpm_metadata() -> CpmMetadata:
    cpm_min = settings.cpm_min
    cpm_max = settings.cpm_max
    cpm_step = settings.cpm_step
    median_competitor: float | None = None
    max_competitor: float | None = None
    source: Literal["artifact", "config", "unavailable"] = "unavailable"

    env_median = settings.cpm_median_competitor
    env_max = settings.cpm_max_competitor
    if env_median is not None or env_max is not None:
        median_competitor = env_median
        max_competitor = env_max
        source = "config"
    else:
        values = load_reference_cpm_values()
        if values is not None:
            if np is None:
                import numpy as _np

                median_competitor = float(_np.median(values))
                max_competitor = float(_np.max(values))
                cpm_min = float(_np.min(values))
                cpm_max = float(_np.max(values))
            else:
                median_competitor = float(np.median(values))
                max_competitor = float(np.max(values))
                cpm_min = float(np.min(values))
                cpm_max = float(np.max(values))
            source = "artifact"

    return CpmMetadata(
        min=cpm_min,
        max=cpm_max,
        step=cpm_step,
        median_competitor_cpm=median_competitor,
        max_competitor_cpm=max_competitor,
        source=source,
    )


def build_time_metadata() -> TimeMetadata:
    min_hour = settings.time_min_hour
    max_hour = settings.time_max_hour
    presets = [
        preset
        for preset in DEFAULT_TIME_PRESETS
        if min_hour <= preset <= max_hour
    ]
    return TimeMetadata(
        min_hour=min_hour,
        max_hour=max_hour,
        recommended_presets=presets,
        session_silence_window_hours=settings.session_silence_window_hours,
    )


def build_metadata_response() -> MetadataResponse:
    artifacts = model_artifact_status()
    return MetadataResponse(
        model_ready=all(item["exists"] for item in artifacts.values()),
        model_loaded=model_bundle is not None,
        model_version=settings.model_version,
        publisher_universe=load_publisher_universe_metadata(),
        cpm=build_cpm_metadata(),
        time=build_time_metadata(),
        limits=LimitsMetadata(
            max_sweep_points=settings.max_sweep_points,
            max_recent_predictions=settings.max_recent_predictions,
        ),
    )


def generate_sweep_cpms(cpm_range: CpmRange) -> list[float]:
    points: list[float] = []
    cpm = cpm_range.min
    while cpm <= cpm_range.max + 1e-9:
        points.append(round(cpm, 6))
        cpm += cpm_range.step
    return points


def validate_sweep_point_count(cpm_range: CpmRange) -> None:
    point_count = len(generate_sweep_cpms(cpm_range))
    if point_count > settings.max_sweep_points:
        raise ValueError(
            f"sweep generates {point_count} points, which exceeds MAX_SWEEP_POINTS={settings.max_sweep_points}"
        )
    if point_count == 0:
        raise ValueError("cpm_range must generate at least one sweep point")


def run_retrain(command: str) -> None:
    subprocess.run(command, cwd=PROJECT_ROOT, shell=True, check=False)


@app.get("/health")
def health() -> dict[str, Any]:
    artifacts = model_artifact_status()
    return {
        "status": "ok",
        "model_loaded": model_bundle is not None,
        "model_ready": all(item["exists"] for item in artifacts.values()),
        "artifacts": artifacts,
    }


@app.get("/metadata", response_model=MetadataResponse)
def metadata() -> MetadataResponse:
    return build_metadata_response()


@app.post("/predict", response_model=PredictionResponse)
def predict(request: CampaignRequest) -> PredictionResponse:
    start = time.perf_counter()
    prediction_id = str(uuid4())
    try:
        bundle = get_model_bundle()
        values, drift_flag, drift_report = bundle.predict(request)
        if drift_flag:
            drift_alert_count.inc()
        prediction_count.inc()
        response = PredictionResponse(
            at_least_one=values["at_least_one"],
            at_least_two=values["at_least_two"],
            at_least_three=values["at_least_three"],
            model_version=settings.model_version,
            drift_flag=drift_flag,
            prediction_id=prediction_id,
        )
        recent_predictions.appendleft(
            {
                "prediction_id": prediction_id,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "request": request.model_dump(),
                "response": response.model_dump(),
                "drift_report": drift_report,
                "latency_seconds": time.perf_counter() - start,
            }
        )
        return response
    except FileNotFoundError as exc:
        prediction_error_count.inc()
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except InferenceDependencyError as exc:
        prediction_error_count.inc()
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        prediction_error_count.inc()
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        prediction_latency_seconds.observe(time.perf_counter() - start)


@app.post("/predict/sweep", response_model=SweepResponse)
def predict_sweep(request: SweepRequest) -> SweepResponse:
    start = time.perf_counter()
    sweep_id = str(uuid4())
    try:
        validate_sweep_point_count(request.cpm_range)
        bundle = get_model_bundle()
        points: list[SweepPoint] = []
        for cpm in generate_sweep_cpms(request.cpm_range):
            campaign_request = CampaignRequest(
                cpm=cpm,
                hour_start=request.base_request.hour_start,
                hour_end=request.base_request.hour_end,
                publishers=request.base_request.publishers,
                audience_size=request.base_request.audience_size,
                user_ids=request.base_request.user_ids,
            )
            values, drift_flag, _ = bundle.predict(campaign_request)
            audience_size = request.base_request.audience_size
            predicted_reach = int(round(audience_size * values["at_least_one"]))
            points.append(
                SweepPoint(
                    cpm=cpm,
                    at_least_one=values["at_least_one"],
                    at_least_two=values["at_least_two"],
                    at_least_three=values["at_least_three"],
                    predicted_reach=predicted_reach,
                    drift_flag=drift_flag,
                )
            )
        return SweepResponse(
            sweep_id=sweep_id,
            points=points,
            model_version=settings.model_version,
            latency_seconds=round(time.perf_counter() - start, 3),
        )
    except ValueError as exc:
        prediction_error_count.inc()
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        prediction_error_count.inc()
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except InferenceDependencyError as exc:
        prediction_error_count.inc()
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        prediction_error_count.inc()
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/predictions/recent")
def predictions_recent(limit: int = 20) -> dict[str, Any]:
    limit = max(1, min(int(limit), settings.max_recent_predictions))
    return {"items": list(recent_predictions)[:limit]}


@app.post("/retrain")
def retrain(background_tasks: BackgroundTasks) -> dict[str, Any]:
    retrain_trigger_count.inc()
    if not settings.enable_retrain:
        return {
            "status": "disabled",
            "message": "Set ENABLE_RETRAIN=true to run the configured retrain command.",
            "command": settings.retrain_command,
        }
    background_tasks.add_task(run_retrain, settings.retrain_command)
    return {"status": "started", "command": settings.retrain_command}


@app.get("/metrics")
def metrics() -> Response:
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host=os.getenv("API_HOST", "127.0.0.1"),
        port=int(os.getenv("API_PORT", "8000")),
    )
