import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useHealth, useMetadata } from "@/features/system/hooks";
import {
  getPredictionErrorDetail,
  isModelUnavailableError,
  isValidationError,
} from "../api";
import { usePredictCampaign } from "../hooks";
import type { CampaignRequest } from "../types";
import { CampaignForm } from "./CampaignForm";
import { PredictionAlerts } from "./PredictionAlerts";
import { PredictionResultCards } from "./PredictionResultCards";
import { PredictionSummaryCard } from "./PredictionSummaryCard";
import { PredictionUnavailableState } from "./PredictionUnavailableState";
import { ProbabilityBreakdown } from "./ProbabilityBreakdown";
import { Card } from "@/shared/components/Card";
import { ErrorState } from "@/shared/components/ErrorState";
import { LoadingState } from "@/shared/components/LoadingState";

export function CampaignPredictionPanel() {
  const { t } = useTranslation();
  const health = useHealth();
  const metadata = useMetadata();
  const predict = usePredictCampaign();

  const [lastRequest, setLastRequest] = useState<CampaignRequest | null>(null);
  const [formCpm, setFormCpm] = useState(0);

  const modelReady =
    health.data?.model_ready ?? metadata.data?.model_ready ?? undefined;
  const modelLoaded =
    health.data?.model_loaded ?? metadata.data?.model_loaded ?? undefined;
  const showFormWarning =
    modelReady === false || modelLoaded === false;

  const publisherEmpty =
    metadata.data !== undefined &&
    metadata.data.publisher_universe.length === 0;

  const handleSubmit = (request: CampaignRequest) => {
    setLastRequest(request);
    predict.mutate(request);
  };

  const handleReset = () => {
    predict.reset();
    setLastRequest(null);
  };

  const displayAudienceSize = lastRequest?.audience_size ?? 0;

  return (
    <section className="space-y-6" aria-labelledby="prediction-panel-title">
      <div>
        <h2
          id="prediction-panel-title"
          className="text-lg font-semibold text-slate-900 sm:text-xl"
        >
          {t("prediction.panel.title")}
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          {t("prediction.panel.description")}
        </p>
      </div>

      {showFormWarning ? (
        <div
          className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-4"
          role="alert"
        >
          <AlertTriangle
            className="mt-0.5 h-5 w-5 shrink-0 text-amber-600"
            aria-hidden
          />
          <p className="text-sm text-amber-950">
            {t("prediction.alerts.formModelNotReady")}
          </p>
        </div>
      ) : null}

      <PredictionAlerts
        cpm={lastRequest?.cpm ?? formCpm}
        metadata={metadata.data}
        metadataError={metadata.isError}
        response={predict.data}
        modelReady={modelReady}
        publisherUniverseEmpty={publisherEmpty}
      />

      <Card
        title={t("prediction.form.cardTitle")}
        description={t("prediction.form.cardDescription")}
      >
        {metadata.isLoading && !metadata.data ? (
          <LoadingState />
        ) : (
          <CampaignForm
            metadata={metadata.data}
            isSubmitting={predict.isPending}
            onSubmit={handleSubmit}
            onResetResults={handleReset}
            onCpmChange={setFormCpm}
          />
        )}
      </Card>

      {predict.isPending ? <LoadingState label={t("prediction.form.submitting")} /> : null}

      {predict.isError ? (
        isModelUnavailableError(predict.error) ? (
          <PredictionUnavailableState
            detail={getPredictionErrorDetail(predict.error)}
            onRetry={() => {
              if (lastRequest) {
                predict.mutate(lastRequest);
              }
            }}
          />
        ) : (
          <ErrorState
            title={
              isValidationError(predict.error)
                ? t("prediction.errors.validationTitle")
                : t("prediction.errors.genericTitle")
            }
            description={getPredictionErrorDetail(predict.error)}
            onRetry={() => {
              if (lastRequest) {
                predict.mutate(lastRequest);
              }
            }}
          />
        )
      ) : null}

      {predict.data && displayAudienceSize > 0 ? (
        <div className="space-y-6">
          <PredictionSummaryCard
            response={predict.data}
            audienceSize={displayAudienceSize}
          />
          <PredictionResultCards response={predict.data} />
          <ProbabilityBreakdown />
        </div>
      ) : null}
    </section>
  );
}
