from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd


def psi(
    reference: np.ndarray,
    current: np.ndarray,
    bins: int = 10,
    eps: float = 1e-6,
) -> float:
    reference = np.asarray(reference, dtype=np.float64)
    current = np.asarray(current, dtype=np.float64)
    reference = reference[np.isfinite(reference)]
    current = current[np.isfinite(current)]
    if reference.size == 0 or current.size == 0:
        return 0.0

    quantiles = np.linspace(0.0, 1.0, bins + 1)
    edges = np.unique(np.quantile(reference, quantiles))
    if edges.size < 2:
        return 0.0

    edges[0] = -np.inf
    edges[-1] = np.inf
    ref_counts, _ = np.histogram(reference, bins=edges)
    cur_counts, _ = np.histogram(current, bins=edges)

    ref_pct = np.maximum(ref_counts / max(ref_counts.sum(), 1), eps)
    cur_pct = np.maximum(cur_counts / max(cur_counts.sum(), 1), eps)
    return float(np.sum((cur_pct - ref_pct) * np.log(cur_pct / ref_pct)))


def data_drift_report(
    reference: pd.DataFrame,
    current: pd.DataFrame,
    feature_columns: list[str] | None = None,
    threshold: float = 0.2,
    bins: int = 10,
) -> dict[str, Any]:
    if feature_columns is None:
        feature_columns = [
            col
            for col in reference.columns
            if col in current.columns and pd.api.types.is_numeric_dtype(reference[col])
        ]

    features: dict[str, Any] = {}
    drifted_features: list[str] = []
    for col in feature_columns:
        value = psi(reference[col].to_numpy(), current[col].to_numpy(), bins=bins)
        drifted = value > threshold
        if drifted:
            drifted_features.append(col)
        features[col] = {
            "psi": value,
            "drift": drifted,
            "threshold": float(threshold),
            "reference_missing_share": float(reference[col].isna().mean()),
            "current_missing_share": float(current[col].isna().mean()),
        }

    return {
        "created_at": datetime.now(timezone.utc).isoformat(),
        "type": "data_drift",
        "method": "psi",
        "threshold": float(threshold),
        "bins": int(bins),
        "reference_rows": int(len(reference)),
        "current_rows": int(len(current)),
        "features_checked": int(len(feature_columns)),
        "drift_flag": bool(drifted_features),
        "drifted_features": drifted_features,
        "features": features,
    }


def concept_drift_report(
    y_true: pd.DataFrame,
    y_pred: pd.DataFrame,
    baseline_mae: float | None = None,
    threshold_ratio: float = 1.25,
) -> dict[str, Any]:
    common = [col for col in y_true.columns if col in y_pred.columns]
    per_target: dict[str, Any] = {}
    maes = []
    for col in common:
        err = np.abs(y_true[col].astype(float).to_numpy() - y_pred[col].astype(float).to_numpy())
        mae = float(np.mean(err)) if err.size else 0.0
        per_target[col] = {"MAE": mae}
        maes.append(mae)

    mean_mae = float(np.mean(maes)) if maes else 0.0
    drift_flag = bool(baseline_mae is not None and mean_mae > baseline_mae * threshold_ratio)
    return {
        "created_at": datetime.now(timezone.utc).isoformat(),
        "type": "concept_drift",
        "method": "mae_ratio",
        "rows": int(min(len(y_true), len(y_pred))),
        "mean_MAE": mean_mae,
        "baseline_MAE": baseline_mae,
        "threshold_ratio": float(threshold_ratio),
        "drift_flag": drift_flag,
        "targets": per_target,
    }


def target_drift_report(
    reference_targets: pd.DataFrame,
    current_targets: pd.DataFrame,
    threshold: float = 0.2,
    bins: int = 10,
) -> dict[str, Any]:
    report = data_drift_report(
        reference_targets,
        current_targets,
        threshold=threshold,
        bins=bins,
    )
    report["type"] = "target_drift"
    return report


def save_drift_report(report: dict[str, Any], reports_dir: str | Path = "reports/drift") -> Path:
    reports_path = Path(reports_dir)
    reports_path.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    path = reports_path / f"drift_report_{timestamp}.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    return path
