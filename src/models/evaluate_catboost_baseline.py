import argparse
import json
from pathlib import Path
from contextlib import nullcontext

import numpy as np
import pandas as pd
from catboost import CatBoostRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split

try:
    import mlflow
except Exception:
    mlflow = None


def extract_features(df: pd.DataFrame) -> pd.DataFrame:
    """Извлекает те же фичи, что и при обучении."""
    features = pd.DataFrame(index=df.index)
    features["cpm"] = df["cpm"].astype(float)
    features["audience_size"] = df["audience_size"].astype(float)
    features["window_length"] = (df["hour_end"] - df["hour_start"] + 1).astype(float)

    def count_pubs(s):
        if pd.isna(s) or s == "":
            return 0
        return len(str(s).split(","))

    features["n_publishers"] = df["publishers"].apply(count_pubs).astype(float)
    features["cpm_per_hour"] = features["cpm"] / features["window_length"]
    return features


def safe_mape(y_true, y_pred, epsilon=1e-8):
    """MAPE с защитой от деления на ноль."""
    # Считаем MAPE только там, где истинное значение достаточно далеко от нуля
    mask = y_true > epsilon
    if not np.any(mask):
        return 0.0
    return np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--stage2-dir", type=str, default="data/interim/stage2", help="Данные для валидации")
    ap.add_argument("--models-dir", type=str, default="data/processed/stage3", help="Папка с моделями")
    ap.add_argument("--out-dir", type=str, default="artifacts/stage5", help="Папка для отчетов")
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--mlflow-tracking-uri", type=str, default=None)
    ap.add_argument("--mlflow-experiment", type=str, default="vk-ads-clicks-prediction")
    ap.add_argument("--disable-mlflow", action="store_true")
    args = ap.parse_args()

    stage2_dir = Path(args.stage2_dir)
    models_dir = Path(args.models_dir)
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    # --- НАСТРОЙКА MLFLOW (опционально) ---
    mlflow_enabled = (not args.disable_mlflow) and (mlflow is not None)
    if args.mlflow_tracking_uri and mlflow_enabled:
        mlflow.set_tracking_uri(args.mlflow_tracking_uri)
    if mlflow_enabled:
        mlflow.set_experiment(args.mlflow_experiment)

    run_context = mlflow.start_run(run_name="CatBoost_Detailed_Evaluation") if mlflow_enabled else nullcontext()
    with run_context:
        if mlflow_enabled:
            mlflow.log_param("seed", args.seed)
            mlflow.log_param("models_dir", str(models_dir))
            mlflow.log_param("stage2_dir", str(stage2_dir))

        print("Loading data to recreate validation set...")
        campaigns = pd.read_parquet(stage2_dir / "offline_campaigns.parquet")
        answers = pd.read_parquet(stage2_dir / "offline_answers.parquet")
        df = campaigns.merge(answers, on="campaign_id")

        print("Extracting features...")
        X = extract_features(df)

        # Повторяем сплит с тем же seed, чтобы точно получить ту же валидационную выборку (X_val)
        _, X_val, _, idx_val = train_test_split(
            X, np.arange(len(X)), test_size=0.2, random_state=args.seed
        )

        df_val = df.iloc[idx_val].copy()
        mlflow.log_param("val_set_size", len(df_val))

        targets = ["at_least_one", "at_least_two", "at_least_three"]
        detailed_metrics = {}

        print("\nCalculating metrics...\n" + "=" * 50)
        print(f"{'Target':<18} | {'MAE':<8} | {'RMSE':<8} | {'MAPE(%)':<8} | {'R²':<8}")
        print("=" * 50)

        for target in targets:
            y_true = df_val[target].values

            # Загрузка модели
            model = CatBoostRegressor()
            model.load_model(str(models_dir / f"cb_{target}.cbm"))

            # Предсказание
            y_pred = model.predict(X_val)
            y_pred = np.clip(y_pred, 0.0, 1.0)

            # Расчет метрик
            mae = mean_absolute_error(y_true, y_pred)
            rmse = np.sqrt(mean_squared_error(y_true, y_pred))
            mape = safe_mape(y_true, y_pred)
            r2 = r2_score(y_true, y_pred)

            detailed_metrics[target] = {
                "MAE": float(mae),
                "RMSE": float(rmse),
                "MAPE": float(mape),
                "R2": float(r2)
            }

            print(f"{target:<18} | {mae:.4f}   | {rmse:.4f}   | {mape:.2f}    | {r2:.4f}")

            # 2. Логируем детальные метрики по каждому таргету отдельно
            if mlflow_enabled:
                mlflow.log_metric(f"{target}_MAE", float(mae))
                mlflow.log_metric(f"{target}_RMSE", float(rmse))
                mlflow.log_metric(f"{target}_MAPE", float(mape))
                mlflow.log_metric(f"{target}_R2", float(r2))

        print("=" * 50)

        # Средние значения по всем таргетам
        mean_mae = np.mean([m["MAE"] for m in detailed_metrics.values()])
        mean_rmse = np.mean([m["RMSE"] for m in detailed_metrics.values()])
        mean_r2 = np.mean([m["R2"] for m in detailed_metrics.values()])

        print(f"{'MEAN (Overall)':<18} | {mean_mae:.4f}   | {mean_rmse:.4f}   | {'-':<8} | {mean_r2:.4f}")

        # 3. Логируем агрегированные (итоговые) метрики
        if mlflow_enabled:
            mlflow.log_metric("overall_mean_MAE", float(mean_mae))
            mlflow.log_metric("overall_mean_RMSE", float(mean_rmse))
            mlflow.log_metric("overall_mean_R2", float(mean_r2))

        detailed_metrics["overall"] = {
            "mean_MAE": float(mean_mae),
            "mean_RMSE": float(mean_rmse),
            "mean_R2": float(mean_r2)
        }

        # Сохраняем подробный отчет локально
        report_path = out_dir / "detailed_evaluation.json"
        with open(report_path, "w", encoding="utf-8") as f:
            json.dump(detailed_metrics, f, ensure_ascii=False, indent=2)

        print(f"\nDetailed metrics saved to {report_path}")

        # 4. Логируем сохраненный файл json как артефакт в MLflow
        if mlflow_enabled:
            mlflow.log_artifact(str(report_path), artifact_path="evaluation_reports")
            print("[MLflow] Validation metrics and artifacts successfully registered!")


if __name__ == "__main__":
    main()