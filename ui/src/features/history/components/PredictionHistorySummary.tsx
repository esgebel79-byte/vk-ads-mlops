import { useTranslation } from "react-i18next";
import type { HistorySummary } from "../types";
import {
  formatDateTime,
  formatNumber,
  formatOptionalNumber,
} from "@/shared/lib/formatters";

type PredictionHistorySummaryProps = {
  summary: HistorySummary;
};

export function PredictionHistorySummary({
  summary,
}: PredictionHistorySummaryProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const unavailable = t("history.unavailable");

  const cards = [
    {
      label: t("history.summary.total"),
      value: formatNumber(summary.total, locale),
    },
    {
      label: t("history.summary.avgLatency"),
      value:
        summary.averageLatencySeconds != null
          ? formatOptionalNumber(
              summary.averageLatencySeconds,
              locale,
              unavailable,
            ) + " s"
          : unavailable,
    },
    {
      label: t("history.summary.driftWarnings"),
      value: formatNumber(summary.driftWarningCount, locale),
    },
    {
      label: t("history.summary.topModelVersion"),
      value: summary.mostCommonModelVersion ?? unavailable,
    },
    {
      label: t("history.summary.latestPrediction"),
      value: summary.latestPredictionAt
        ? formatDateTime(summary.latestPredictionAt, locale)
        : unavailable,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map(({ label, value }) => (
        <article
          key={label}
          className="rounded-xl border border-surface-border bg-surface-card p-4 shadow-card"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-900">{value}</p>
        </article>
      ))}
    </div>
  );
}
