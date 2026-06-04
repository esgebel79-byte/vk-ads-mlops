import { useTranslation } from "react-i18next";
import type { HealthResponse, MetadataResponse } from "../types";
import type { HistorySummary } from "@/features/history/types";
import {
  formatDateTime,
  formatNumber,
  formatOptionalNumber,
} from "@/shared/lib/formatters";
import { StatusBadge } from "@/shared/components/StatusBadge";

type SystemOverviewGridProps = {
  health: HealthResponse | undefined;
  metadata: MetadataResponse | undefined;
  healthConnected: boolean;
  healthLoading: boolean;
  historySummary: HistorySummary | null;
};

export function SystemOverviewGrid({
  health,
  metadata,
  healthConnected,
  healthLoading,
  historySummary,
}: SystemOverviewGridProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const unavailable = t("history.unavailable");

  const cpmAvailable =
    metadata?.cpm.source != null && metadata.cpm.source !== "unavailable";

  const items = [
    {
      label: t("systemAnalytics.connection"),
      value: healthLoading ? (
        t("states.loading")
      ) : (
        <StatusBadge
          label={
            healthConnected
              ? t("systemAnalytics.connected")
              : t("systemAnalytics.disconnected")
          }
          variant={healthConnected ? "success" : "danger"}
        />
      ),
    },
    {
      label: t("health.modelReady"),
      value: health ? (
        <StatusBadge
          label={
            health.model_ready
              ? t("health.readyYes")
              : t("health.readyNo")
          }
          variant={health.model_ready ? "success" : "warning"}
        />
      ) : (
        unavailable
      ),
    },
    {
      label: t("systemAnalytics.metadataAvailable"),
      value: metadata ? (
        <StatusBadge
          label={t("common.yes")}
          variant="success"
        />
      ) : (
        <StatusBadge label={t("common.no")} variant="neutral" />
      ),
    },
    {
      label: t("metadata.publisherUniverse"),
      value: metadata
        ? formatNumber(metadata.publisher_universe.length, locale)
        : unavailable,
    },
    {
      label: t("systemAnalytics.cpmMetadata"),
      value: (
        <StatusBadge
          label={cpmAvailable ? t("common.yes") : t("common.no")}
          variant={cpmAvailable ? "success" : "warning"}
        />
      ),
    },
    {
      label: t("systemAnalytics.recentPredictionCount"),
      value: historySummary
        ? formatNumber(historySummary.total, locale)
        : unavailable,
    },
    {
      label: t("systemAnalytics.avgLatency"),
      value:
        historySummary?.averageLatencySeconds != null
          ? `${formatOptionalNumber(historySummary.averageLatencySeconds, locale, unavailable)} s`
          : unavailable,
    },
    {
      label: t("systemAnalytics.driftWarnings"),
      value: historySummary
        ? formatNumber(historySummary.driftWarningCount, locale)
        : unavailable,
    },
    {
      label: t("systemAnalytics.lastPrediction"),
      value: historySummary?.latestPredictionAt
        ? formatDateTime(historySummary.latestPredictionAt, locale)
        : unavailable,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(({ label, value }) => (
        <article
          key={label}
          className="rounded-xl border border-surface-border bg-surface-card p-4 shadow-card"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <div className="mt-2 text-sm font-semibold text-slate-900">{value}</div>
        </article>
      ))}
    </div>
  );
}
