import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useHealth, useMetadata } from "@/features/system/hooks";
import {
  getPredictionErrorDetail,
  isModelUnavailableError,
  isValidationError,
} from "../api";
import { usePredictCampaign, usePredictCpmSweep } from "../hooks";
import type { CampaignFormInput } from "../schema";
import type { CampaignRequest } from "../types";
import { AuctionIntelligencePanel } from "./AuctionIntelligencePanel";
import { WinProbabilityIndicator } from "./WinProbabilityIndicator";
import { CampaignForm } from "./CampaignForm";
import { CpmSweepPanel } from "./CpmSweepPanel";
import { PredictionAlerts } from "./PredictionAlerts";
import { PredictionResultCards } from "./PredictionResultCards";
import { PredictionSummaryCard } from "./PredictionSummaryCard";
import { PredictionUnavailableState } from "./PredictionUnavailableState";
import { ProbabilityBreakdown } from "./ProbabilityBreakdown";
import { Card } from "@/shared/components/Card";
import { ErrorState } from "@/shared/components/ErrorState";
import { LoadingState } from "@/shared/components/LoadingState";
import { sanitizeMarketerErrorDetail } from "@/shared/lib/sanitizeErrorDetail";

export function CampaignPredictionPanel() {
  const { t } = useTranslation();
  const health = useHealth();
  const metadata = useMetadata();
  const predict = usePredictCampaign();
  const sweep = usePredictCpmSweep();

  const [lastRequest, setLastRequest] = useState<CampaignRequest | null>(null);
  const [formCpm, setFormCpm] = useState(0);
  const [campaignFormValues, setCampaignFormValues] =
    useState<CampaignFormInput | null>(null);
  const [campaignFormValid, setCampaignFormValid] = useState(false);

  const modelReady =
    health.data?.model_ready ?? metadata.data?.model_ready ?? undefined;
  const modelNotReady = modelReady === false;

  const handleSubmit = (request: CampaignRequest) => {
    setLastRequest(request);
    predict.mutate(request);
  };

  const handleReset = () => {
    predict.reset();
    sweep.reset();
    setLastRequest(null);
  };

  const displayAudienceSize = lastRequest?.audience_size ?? 0;
  const selectedCpm = lastRequest?.cpm ?? formCpm;

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

      <div className="grid gap-6 xl:grid-cols-[minmax(300px,380px)_1fr]">
        <div className="space-y-6">
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
                modelNotReady={modelNotReady}
                onSubmit={handleSubmit}
                onResetResults={handleReset}
                onCpmChange={setFormCpm}
                onFormValuesChange={(values, valid) => {
                  setCampaignFormValues(values);
                  setCampaignFormValid(valid);
                }}
              />
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <PredictionAlerts
            cpm={selectedCpm}
            metadata={metadata.data}
            metadataError={metadata.isError}
            response={predict.data}
          />

          <WinProbabilityIndicator
            cpm={selectedCpm}
            cpmMeta={metadata.data?.cpm}
          />

          {predict.isPending ? (
            <LoadingState label={t("prediction.form.submitting")} />
          ) : null}

          {predict.isError ? (
            isModelUnavailableError(predict.error) ? (
              <PredictionUnavailableState />
            ) : (
              <ErrorState
                title={
                  isValidationError(predict.error)
                    ? t("prediction.errors.validationTitle")
                    : t("prediction.errors.genericTitle")
                }
                description={
                  sanitizeMarketerErrorDetail(
                    getPredictionErrorDetail(predict.error),
                  ) ?? t("states.errorDescription")
                }
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

          <CpmSweepPanel
            metadata={metadata.data}
            modelNotReady={modelNotReady}
            campaignFormValues={campaignFormValues}
            campaignFormValid={campaignFormValid}
            sweep={sweep}
          />

          <AuctionIntelligencePanel
            cpm={selectedCpm}
            metadata={metadata.data}
            sweepPoints={sweep.data?.points}
          />
        </div>
      </div>
    </section>
  );
}
