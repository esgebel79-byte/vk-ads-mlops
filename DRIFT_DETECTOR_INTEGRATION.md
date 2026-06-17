# ============================================================================
# ПРИМЕР ИНТЕГРАЦИИ DRIFT DETECTION В main.py
# ============================================================================

# 1. ДОБАВИТЬ ИМПОРТ В НАЧАЛО ФАЙЛА
# ============================================================================
# Добавить после других импортов из app.metrics:

from app.drift_detector import check_prediction_drift, get_drift_window_stats


# 2. МЕСТО ИНТЕГРАЦИИ В ФУНКЦИИ @app.post("/predict")
# ============================================================================
# После получения sanitized предсказаний вставить проверку дрифта:

@app.post("/predict", response_model=PredictionResponse)
def predict(request: CampaignRequest) -> PredictionResponse:
    start = time.perf_counter()
    prediction_id = str(uuid4())
    try:
        bundle = get_model_bundle()
        selected_user_ids, source = select_inference_user_ids(
            request,
            bundle.user_id_sorted,
            settings.default_inference_user_sample_size,
        )
        if source == "default_sample":
            log_default_user_sample("/predict", len(selected_user_ids), request.audience_size)

        values, drift_flag, drift_report = bundle.predict(request, selected_user_ids)
        try:
            sanitized = sanitize_prediction_values(values)
        except InferenceOutputError as exc:
            log_non_finite_output(
                "/predict",
                request,
                cpm=request.cpm,
                selected_user_count=len(selected_user_ids),
            )
            raise HTTPException(status_code=500, detail=str(exc)) from exc

        # ===== ДОБАВИТЬ ПРОВЕРКУ ДРИФТА ДАННЫХ =====
        # Проверяем дрифт на основе среднего предсказания "at_least_one"
        # (главное целевое значение модели)
        avg_prediction = (
            sanitized["at_least_one"] + 
            sanitized["at_least_two"] + 
            sanitized["at_least_three"]
        ) / 3  # Среднее по всем трем целевым переменным
        
        drift_detected = check_prediction_drift(avg_prediction)
        
        # Обновляем флаг дрифта (объединяем с исходным флагом)
        drift_flag = drift_flag or drift_detected
        
        # Опционально: получить статистику для логирования
        drift_stats = get_drift_window_stats()
        logger.info(
            f"Prediction {prediction_id}: drift_detected={drift_detected}, "
            f"avg_prediction={avg_prediction:.4f}, "
            f"reference_mean={drift_stats['reference_mean']:.4f}, "
            f"window_size={drift_stats['window_size']}/{drift_stats['window_capacity']}"
        )
        # ===== КОНЕЦ ПРОВЕРКИ ДРИФТА =====

        if drift_flag:
            record_drift_alert()
        response = PredictionResponse(
            at_least_one=sanitized["at_least_one"],
            at_least_two=sanitized["at_least_two"],
            at_least_three=sanitized["at_least_three"],
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
    except HTTPException:
        prediction_error_count.inc()
        raise
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
        set_recent_predictions_size(len(recent_predictions))
        set_drift_window_size(len(recent_feature_rows))


# 3. АЛЬТЕРНАТИВНЫЙ ВАРИАНТ: Интеграция в predict_sweep
# ============================================================================
# Если нужно проверять дрифт и в sweep запросах:

@app.post("/predict/sweep", response_model=SweepResponse)
def predict_sweep(request: SweepRequest) -> SweepResponse:
    start = time.perf_counter()
    sweep_id = str(uuid4())
    try:
        validate_sweep_point_count(request.cpm_range)
        bundle = get_model_bundle()
        selected_user_ids, source = select_inference_user_ids(
            request.base_request,
            bundle.user_id_sorted,
            settings.default_inference_user_sample_size,
        )
        if source == "default_sample":
            log_default_user_sample(
                "/predict/sweep",
                len(selected_user_ids),
                request.base_request.audience_size,
            )

        points: list[SweepPoint] = []
        warnings: list[str] = []
        audience_size = request.base_request.audience_size
        
        for cpm in generate_sweep_cpms(request.cpm_range):
            campaign_request = CampaignRequest(
                cpm=cpm,
                hour_start=request.base_request.hour_start,
                hour_end=request.base_request.hour_end,
                publishers=request.base_request.publishers,
                audience_size=request.base_request.audience_size,
                user_ids=request.base_request.user_ids,
            )
            try:
                values, drift_flag, _ = bundle.predict(campaign_request, selected_user_ids)
                sanitized = sanitize_prediction_values(values)
                predicted_reach = calculate_predicted_reach(audience_size, sanitized["at_least_one"])
                
                # ===== ПРОВЕРКА ДРИФТА ДЛЯ SWEEP =====
                avg_prediction = (
                    sanitized["at_least_one"] + 
                    sanitized["at_least_two"] + 
                    sanitized["at_least_three"]
                ) / 3
                
                drift_detected = check_prediction_drift(avg_prediction)
                drift_flag = drift_flag or drift_detected
                # ===== КОНЕЦ ПРОВЕРКИ =====
                
            except InferenceOutputError:
                log_non_finite_output(
                    "/predict/sweep",
                    request.base_request,
                    cpm=cpm,
                    selected_user_count=len(selected_user_ids),
                )
                warnings.append(
                    f"Skipped CPM {cpm} because the model returned non-finite prediction values."
                )
                continue

            points.append(
                SweepPoint(
                    cpm=cpm,
                    at_least_one=sanitized["at_least_one"],
                    at_least_two=sanitized["at_least_two"],
                    at_least_three=sanitized["at_least_three"],
                    predicted_reach=predicted_reach,
                    drift_flag=drift_flag,
                )
            )

        if not points:
            sweep_error_count.inc()
            if warnings:
                detail = (
                    "CPM sweep failed because the model returned non-finite predictions "
                    "for all sweep points."
                )
            else:
                detail = "CPM sweep failed because no valid sweep points were produced."
            raise HTTPException(status_code=500, detail=detail)

        sweep_request_count.inc()
        return SweepResponse(
            sweep_id=sweep_id,
            points=points,
            model_version=settings.model_version,
            latency_seconds=round(time.perf_counter() - start, 3),
            warnings=warnings,
        )
    # ... exception handlers ...
    finally:
        sweep_latency_seconds.observe(time.perf_counter() - start)
