import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { CpmSweepResponse } from "../types";
import {
  countDriftFlaggedPoints,
  findBestSweepPoint,
} from "../lib/sweep";
import { formatNumber } from "@/shared/lib/formatters";
import { cn } from "@/shared/lib/cn";

type SweepSummaryCardsProps = {
  response: CpmSweepResponse;
};

type SummaryItem = {
  id: string;
  label: string;
  value: string;
  highlight?: boolean;
};

export function SweepSummaryCards({ response }: SweepSummaryCardsProps) {
  const { t, i18n } = useTranslation();

  const best = useMemo(
    () => findBestSweepPoint(response.points),
    [response.points],
  );

  const driftCount = countDriftFlaggedPoints(response.points);

  const items: SummaryItem[] = [
    {
      id: "best-cpm",
      label: t("prediction.sweep.summary.bestCpm"),
      value:
        best != null
          ? formatNumber(best.cpm, i18n.language, { maximumFractionDigits: 2 })
          : "—",
      highlight: true,
    },
    {
      id: "max-reach",
      label: t("prediction.sweep.summary.highestReach"),
      value:
        best != null
          ? formatNumber(best.predicted_reach, i18n.language, {
              maximumFractionDigits: 0,
            })
          : "—",
      highlight: true,
    },
    {
      id: "point-count",
      label: t("prediction.sweep.summary.pointCount"),
      value: formatNumber(response.points.length, i18n.language, {
        maximumFractionDigits: 0,
      }),
    },
    {
      id: "model-version",
      label: t("prediction.sweep.summary.modelVersion"),
      value: response.model_version,
    },
    {
      id: "analysis-time",
      label: t("prediction.sweep.summary.analysisTime"),
      value: formatNumber(response.latency_seconds, i18n.language, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    },
    {
      id: "unusual-scenarios",
      label: t("prediction.sweep.summary.unusualScenarios"),
      value: formatNumber(driftCount, i18n.language, {
        maximumFractionDigits: 0,
      }),
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.id}
          className={cn(
            "rounded-lg border px-4 py-3",
            item.highlight
              ? "border-brand-200 bg-brand-50/60"
              : "border-surface-border bg-slate-50/50",
          )}
        >
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {item.label}
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
