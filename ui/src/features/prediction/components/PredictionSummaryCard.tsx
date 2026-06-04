import { useTranslation } from "react-i18next";
import { formatNumber } from "@/shared/lib/formatters";
import { Card } from "@/shared/components/Card";
import type { PredictionResponse } from "../types";
import { computePredictedReach } from "../lib/alerts";

type PredictionSummaryCardProps = {
  response: PredictionResponse;
  audienceSize: number;
};

export function PredictionSummaryCard({
  response,
  audienceSize,
}: PredictionSummaryCardProps) {
  const { t, i18n } = useTranslation();
  const reach = computePredictedReach(audienceSize, response.at_least_one);

  return (
    <Card
      title={t("prediction.results.summaryTitle")}
      description={t("prediction.results.summaryDescription")}
      className="border-brand-200 bg-gradient-to-br from-white to-brand-50/40"
    >
      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t("prediction.results.uniqueReach")}
          </p>
          <p className="mt-1 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            {formatNumber(reach, i18n.language, { maximumFractionDigits: 0 })}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {t("prediction.results.uniqueReachFormula")}
          </p>
        </div>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-surface-border bg-white/80 px-3 py-2">
            <dt className="text-xs text-slate-500">
              {t("prediction.results.modelVersion")}
            </dt>
            <dd className="mt-0.5 text-sm font-medium text-slate-900">
              {response.model_version}
            </dd>
          </div>
          <div className="rounded-lg border border-surface-border bg-white/80 px-3 py-2">
            <dt className="text-xs text-slate-500">
              {t("prediction.results.predictionId")}
            </dt>
            <dd className="mt-0.5 break-all font-mono text-xs text-slate-800">
              {response.prediction_id}
            </dd>
          </div>
        </dl>
      </div>
    </Card>
  );
}
