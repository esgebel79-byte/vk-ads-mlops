В предоставленном коде импортирована библиотека import mlflow, однако необходимая обертка для логирования в MLflow полностью отсутствует. Скрипт просто выполняет инференс (предсказание) по уже обученным моделям CatBoost и сохраняет результаты в файл, никак не фиксируя это событие в системе трекинга.

Для этапа валидации/инференса (обычно это стадия генерации финальных предсказаний) хорошей практикой MLOps является логирование:

Названия эксперимента и инициализация контекста запуска (mlflow.start_run()).

Путей к используемым моделям (в качестве параметров, чтобы понимать, какие версии весов сгенерировали этот прогноз).

Финальных артефактов — самого сгенерированного файла predictions.tsv.

Ниже представлен дополненный код, в который добавлена правильная обертка MLflow.

Дополненный код скрипта
Python
import argparse
from pathlib import Path

import numpy as np
import pandas as pd
from catboost import CatBoostRegressor

import mlflow


def extract_features(df: pd.DataFrame) -> pd.DataFrame:
    """Извлекает числовые признаки из DataFrame кампаний (совпадает с обучением)."""
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
    ap.add_argument("--data-dir", type=str, default="data", help="Папка с исходным validate.tsv")
    ap.add_argument("--models-dir", type=str, default="artifacts/stage3", help="Папка с обученными моделями")
    ap.add_argument("--out-dir", type=str, default="artifacts/stage4", help="Папка для результатов")
    args = ap.parse_args()

    data_dir = Path(args.data_dir)
    models_dir = Path(args.models_dir)
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    # --- НАСТРОЙКА MLFLOW EXPERIMENT ---
    mlflow.set_experiment("vk-ads-clicks-prediction")

    # Открываем контекст автоматического логирования запуска инференса
    with mlflow.start_run(run_name="CatBoost_Inference_Stage"):
        
        # Логируем входные параметры скрипта
        mlflow.log_param("models_dir", str(models_dir))
        mlflow.log_param("data_dir", str(data_dir))

        print("Loading validation data...")
        # Читаем исходный validate.tsv
        validate = pd.read_csv(data_dir / "validate.tsv", sep="\t")
        mlflow.log_param("num_validation_samples", len(validate))

        print("Extracting features...")
        X_val = extract_features(validate)

        targets = ["at_least_one", "at_least_two", "at_least_three"]
        predictions = {}

        for target in targets:
            model_path = models_dir / f"cb_{target}.cbm"
            print(f"Loading and predicting with {model_path.name}...")

            model = CatBoostRegressor()
            model.load_model(str(model_path))

            # Предсказываем и ограничиваем в рамках [0, 1]
            preds = model.predict(X_val)
            preds = np.clip(preds, 0.0, 1.0)

            predictions[target] = preds
            
            # Логируем факт использования конкретной модели под каждый таргет
            mlflow.log_param(f"model_path_{target}", str(model_path))

        # Собираем итоговый датафрейм (строго по порядку строк из validate.tsv)
        out_df = pd.DataFrame({
            "at_least_one": predictions["at_least_one"],
            "at_least_two": predictions["at_least_two"],
            "at_least_three": predictions["at_least_three"]
        })

        # Сохраняем в требуемом формате
        out_path = out_dir / "predictions.tsv"
        out_df.to_csv(out_path, sep="\t", index=False)

        print(f"\nSuccessfully saved predictions to {out_path}")
        print("\nSample of predictions:")
        print(out_df.head())

        # --- ЛОГИРОВАНИЕ ФИНАЛЬНОГО АРТЕФАКТА В MLFLOW ---
        # Сохраняем полученный файл предсказаний прямо в UI MLflow, чтобы его можно было скачать оттуда
        mlflow.log_artifact(str(out_path), artifact_path="validation_outputs")
        print("\nPredictions file successfully logged as an MLflow artifact.")


if __name__ == "__main__":
    main()
