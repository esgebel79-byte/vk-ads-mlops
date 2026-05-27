FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY services/inference_api/requirements.txt /tmp/requirements.txt
COPY services/inference_api/requirements-inference.txt /tmp/requirements-inference.txt
ARG INSTALL_INFERENCE_DEPS=false
RUN pip install --upgrade pip && \
    pip install -r /tmp/requirements.txt && \
    if [ "$INSTALL_INFERENCE_DEPS" = "true" ]; then \
        pip install -r /tmp/requirements-inference.txt; \
    fi

COPY . /app

ENV MODEL_PATH=/app/models/deepsets/deepsets_attn.pt \
    MODEL_REPORT_PATH=/app/models/deepsets/report_stage13.json \
    STAGE10_DIR=/app/data/processed/stage10 \
    MODEL_DEVICE=cpu

EXPOSE 8000

CMD ["uvicorn", "services.inference_api.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
