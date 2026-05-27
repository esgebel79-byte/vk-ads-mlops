import argparse
import json
import os
from pathlib import Path

import numpy as np
import pandas as pd
from catboost import CatBoostRegressor
from sklearn.metrics import mean_absolute_error
from sklearn.model_selection import train_test_split

import mlflow
import mlflow.catboost

# Указываем путь к локальной папке трекинга
mlflow.set_tracking_uri(os.getenv("MLFLOW_TRACKING_URI", "file:./mlruns"))
# Инициализируем эксперимент (если его нет, MLflow создаст его автоматически)
mlflow.set_experiment(os.getenv("MLFLOW_EXPERIMENT", "vk-ads-reach-prediction"))


def extract_features(df: pd.DataFrame) -> pd.DataFrame:
    """Извлекает числовые признаки из DataFrame кампаний."""
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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--stage2-dir", type=str, default="data/interim/stage2")
    ap.add_argument("--out-dir", type=str, default="data/processed/stage3")
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--iters", type=int, default=1000)
    args = ap.parse_args()

    stage2_dir = Path(args.stage2_dir)
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    print("Loading data...")
    campaigns = pd.read_csv(stage2_dir / "offline_campaigns.tsv", sep="\t")
    answers = pd.read_csv(stage2_dir / "offline_answers.tsv", sep="\t")

    df = campaigns.merge(answers, on="campaign_id")

    print("Extracting features...")
    X = extract_features(df)
    y_one = df["at_least_one"].values
    y_two = df["at_least_two"].values
    y_three = df["at_least_three"].values

    X_train, X_val, idx_train, idx_val = train_test_split(
        X, np.arange(len(X)), test_size=0.2, random_state=args.seed
    )

    targets = [
        ("at_least_one", y_one),
        ("at_least_two", y_two),
        ("at_least_three", y_three)
    ]

    metrics_report = {}
    models = {}

    print(f"Train size: {len(X_train)}, Val size: {len(X_val)}")

    # ГЛАВНЫЙ ЗАПУСК MLFLOW (Объединяет весь пайплайн обучения baseline-моделей)
    with mlflow.start_run(run_name="CatBoost_Baseline_Pipeline") as parent_run:
        # Логируем глобальные параметры пайплайна
        mlflow.log_param("pipeline_type", "Multi-Target CatBoost Baseline")
        mlflow.log_param("global_seed", args.seed)
        mlflow.log_param("max_iterations", args.iters)
        mlflow.log_param("train_size", len(X_train))
        mlflow.log_param("val_size", len(X_val))

        for target_name, y_full in targets:
            print(f"\nTraining model for {target_name}...")
            y_train = y_full[idx_train]
            y_val = y_full[idx_val]

            # ВЛОЖЕННЫЙ ЗАПУСК ДЛЯ КОНКРЕТНОГО ТАРГЕТА (Nested Run)
            with mlflow.start_run(run_name=f"CatBoost_{target_name}", nested=True):
                
                model = CatBoostRegressor(
                    iterations=args.iters,
                    learning_rate=0.05,
                    depth=6,
                    eval_metric='MAE',
                    random_seed=args.seed,
                    verbose=100
                )

                model.fit(
                    X_train, y_train,
                    eval_set=(X_val, y_val),
                    early_stopping_rounds=50,
                    use_best_model=True
                )

                preds_val = model.predict(X_val)
                preds_val = np.clip(preds_val, 0.0, 1.0)

                mae = mean_absolute_error(y_val, preds_val)
                metrics_report[target_name] = {"MAE": float(mae)}

                model_path = out_dir / f"cb_{target_name}.cbm"
                model.save_model(str(model_path))
                models[target_name] = model

                print(f"MAE {target_name}: {mae:.5f}")

                # Логируем параметры и метрики конкретной модели в её вложенный запуск
                mlflow.log_param("target", target_name)
                mlflow.log_param("learning_rate", 0.05)
                mlflow.log_param("depth", 6)
                mlflow.log_metric("MAE", float(mae))
                
                # Сохраняем модель как артефакт в MLflow Registry
                mlflow.catboost.log_model(model, artifact_path=f"model_{target_name}")

        # Расчет и логирование итоговой интегральной метрики пайплайна
        mean_mae = np.mean([metrics_report[t]["MAE"] for t, _ in targets])
        metrics_report["mean_MAE"] = float(mean_mae)
        print(f"\nOverall Mean MAE: {mean_mae:.5f}")

        # Отправляем итоговый агрегированный показатель в родительский запуск
        mlflow.log_metric("overall_mean_MAE", float(mean_mae))

        # Сохраняем финальный JSON-отчет
        report = {
            "train_size": len(X_train),
            "val_size": len(X_val),
            "metrics": metrics_report,
            "feature_importance": {
                target_name: dict(zip(X.columns, models[target_name].get_feature_importance()))
                for target_name, _ in targets
            }
        }

        report_path = out_dir / "metrics_report.json"
        with open(report_path, "w", encoding="utf-8") as f:
            json.dump(report, f, ensure_ascii=False, indent=2)

        # Логируем сам файл отчета в качестве артефакта главного запуска
        mlflow.log_artifact(str(report_path))

        print(f"\nSaved models, metrics, and MLflow records successfully.")


if __name__ == "__main__":
    main()
