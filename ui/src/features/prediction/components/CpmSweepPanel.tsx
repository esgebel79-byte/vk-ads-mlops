import { useTranslation } from "react-i18next";
import type { UseMutationResult } from "@tanstack/react-query";
import type { MetadataResponse } from "@/features/system/types";
import { isModelUnavailableError } from "../api";
import type { CampaignFormInput, CpmSweepControlsInput } from "../schema";
import { buildCpmSweepRequest } from "../schema";
import type { CpmSweepRequest, CpmSweepResponse } from "../types";
import { CpmSweepChart } from "./CpmSweepChart";
import { CpmSweepControls } from "./CpmSweepControls";
import { SweepErrorState } from "./SweepErrorState";
import { SweepSummaryCards } from "./SweepSummaryCards";
import { SweepUnavailableState } from "./SweepUnavailableState";
import { Card } from "@/shared/components/Card";
import { EmptyState } from "@/shared/components/EmptyState";

type CpmSweepPanelProps = {
  metadata?: MetadataResponse;
  modelNotReady?: boolean;
  campaignFormValues: CampaignFormInput | null;
  campaignFormValid: boolean;
  sweep: UseMutationResult<CpmSweepResponse, Error, CpmSweepRequest, unknown>;
};

export function CpmSweepPanel({
  metadata,
  modelNotReady = false,
  campaignFormValues,
  campaignFormValid,
  sweep,
}: CpmSweepPanelProps) {
  const { t } = useTranslation();

  const handleRun = (range: CpmSweepControlsInput) => {
    if (!campaignFormValues || !campaignFormValid || modelNotReady) {
      return;
    }
    const request = buildCpmSweepRequest(campaignFormValues, range);
    sweep.mutate(request);
  };

  const handleReset = () => {
    sweep.reset();
  };

  const handleRetry = () => {
    if (sweep.variables) {
      sweep.mutate(sweep.variables);
    }
  };

  const campaignBlocked = !campaignFormValues || !campaignFormValid;

  return (
    <Card
      title={t("prediction.sweep.panelTitle")}
      description={t("prediction.sweep.panelDescription")}
    >
      <div className="space-y-6">
        {modelNotReady ? (
          <EmptyState
            title={t("prediction.sweep.modelNotReadyEmptyTitle")}
            description={t("prediction.sweep.modelNotReadyEmptyDescription")}
            className="border-slate-200 bg-slate-50/80"
          />
        ) : null}

        {campaignBlocked && !modelNotReady ? (
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {t("prediction.sweep.campaignInvalidHint")}
          </p>
        ) : null}

        <CpmSweepControls
          metadata={metadata}
          isRunning={sweep.isPending}
          modelNotReady={modelNotReady}
          onRun={handleRun}
          onReset={handleReset}
        />

        <CpmSweepChart
          points={sweep.data?.points}
          cpmMeta={metadata?.cpm}
          isLoading={sweep.isPending}
          emptyDescription={
            modelNotReady
              ? t("prediction.sweep.modelNotReadyChartEmpty")
              : undefined
          }
        />

        {sweep.isError ? (
          isModelUnavailableError(sweep.error) ? (
            <SweepUnavailableState onRetry={handleRetry} />
          ) : (
            <SweepErrorState error={sweep.error} onRetry={handleRetry} />
          )
        ) : null}

        {sweep.data ? <SweepSummaryCards response={sweep.data} /> : null}
      </div>
    </Card>
  );
}
