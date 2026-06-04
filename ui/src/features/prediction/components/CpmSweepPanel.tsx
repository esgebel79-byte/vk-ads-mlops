import { useTranslation } from "react-i18next";
import type { UseMutationResult } from "@tanstack/react-query";
import type { MetadataResponse } from "@/features/system/types";
import {
  getSweepErrorDetail,
  isModelUnavailableError,
} from "../api";
import type { CampaignFormInput, CpmSweepControlsInput } from "../schema";
import { buildCpmSweepRequest } from "../schema";
import type { CpmSweepRequest, CpmSweepResponse } from "../types";
import { CpmSweepChart } from "./CpmSweepChart";
import { CpmSweepControls } from "./CpmSweepControls";
import { SweepErrorState } from "./SweepErrorState";
import { SweepSummaryCards } from "./SweepSummaryCards";
import { SweepUnavailableState } from "./SweepUnavailableState";
import { Card } from "@/shared/components/Card";

type CpmSweepPanelProps = {
  metadata?: MetadataResponse;
  campaignFormValues: CampaignFormInput | null;
  campaignFormValid: boolean;
  sweep: UseMutationResult<CpmSweepResponse, Error, CpmSweepRequest, unknown>;
};

export function CpmSweepPanel({
  metadata,
  campaignFormValues,
  campaignFormValid,
  sweep,
}: CpmSweepPanelProps) {
  const { t } = useTranslation();

  const handleRun = (range: CpmSweepControlsInput) => {
    if (!campaignFormValues || !campaignFormValid) {
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
        {campaignBlocked ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
            {t("prediction.sweep.campaignInvalidHint")}
          </p>
        ) : null}

        <CpmSweepControls
          metadata={metadata}
          isRunning={sweep.isPending}
          onRun={handleRun}
          onReset={handleReset}
        />

        <CpmSweepChart
          points={sweep.data?.points}
          cpmMeta={metadata?.cpm}
          isLoading={sweep.isPending}
        />

        {sweep.isError ? (
          isModelUnavailableError(sweep.error) ? (
            <SweepUnavailableState
              detail={getSweepErrorDetail(sweep.error)}
              onRetry={handleRetry}
            />
          ) : (
            <SweepErrorState error={sweep.error} onRetry={handleRetry} />
          )
        ) : null}

        {sweep.data ? <SweepSummaryCards response={sweep.data} /> : null}
      </div>
    </Card>
  );
}
