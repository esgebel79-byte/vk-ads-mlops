import { RefreshCw } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { recentPredictionsQueryKey } from "@/features/history/hooks";
import { ArtifactReadinessPanel } from "@/features/system/components/ArtifactReadinessPanel";
import { ModelMetadataPanel } from "@/features/system/components/ModelMetadataPanel";
import { ModelReadinessBanner } from "@/features/system/components/ModelReadinessBanner";
import { RecentActivityPanel } from "@/features/system/components/RecentActivityPanel";
import { SystemAnalyticsPanel } from "@/features/system/components/SystemAnalyticsPanel";
import { useHealth, useMetadata } from "@/features/system/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { formatDateTime } from "@/shared/lib/formatters";

export function SystemStatusPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const health = useHealth();
  const metadata = useMetadata();

  const lastUpdated = useMemo(() => {
    const times = [health.dataUpdatedAt, metadata.dataUpdatedAt].filter(
      (v) => v > 0,
    );
    if (times.length === 0) {
      return null;
    }
    return new Date(Math.max(...times));
  }, [health.dataUpdatedAt, metadata.dataUpdatedAt]);

  const handleRefreshAll = () => {
    void health.refetch();
    void metadata.refetch();
    void queryClient.invalidateQueries({ queryKey: recentPredictionsQueryKey });
  };

  const isRefreshing =
    health.isFetching || metadata.isFetching;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {t("system.title")}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            {t("system.description")}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={handleRefreshAll}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              aria-hidden
            />
            {t("systemAnalytics.refreshAll")}
          </button>
          <p className="text-xs text-slate-500">
            {t("system.lastUpdated")}:{" "}
            {lastUpdated
              ? formatDateTime(lastUpdated, i18n.language)
              : t("system.neverUpdated")}
          </p>
        </div>
      </div>

      <ModelReadinessBanner
        health={health.data}
        metadata={metadata.data}
      />

      <SystemAnalyticsPanel />
      <RecentActivityPanel />
      <ArtifactReadinessPanel />
      <ModelMetadataPanel />
    </div>
  );
}
