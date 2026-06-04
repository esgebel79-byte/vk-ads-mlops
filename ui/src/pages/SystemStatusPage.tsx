import { RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ArtifactStatusList } from "@/features/system/components/ArtifactStatusList";
import { MetadataCard } from "@/features/system/components/MetadataCard";
import { ModelReadinessBanner } from "@/features/system/components/ModelReadinessBanner";
import { useHealth, useMetadata } from "@/features/system/hooks";
import { Card } from "@/shared/components/Card";
import { ErrorState } from "@/shared/components/ErrorState";
import { LoadingState } from "@/shared/components/LoadingState";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { formatDateTime } from "@/shared/lib/formatters";

export function SystemStatusPage() {
  const { t, i18n } = useTranslation();
  const health = useHealth();
  const metadata = useMetadata();

  const lastUpdated = (() => {
    const times = [health.dataUpdatedAt, metadata.dataUpdatedAt].filter(
      (v) => v > 0,
    );
    if (times.length === 0) {
      return null;
    }
    return new Date(Math.max(...times));
  })();

  const handleRefresh = () => {
    void health.refetch();
    void metadata.refetch();
  };

  const isRefreshing = health.isFetching || metadata.isFetching;

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
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              aria-hidden
            />
            {t("system.refresh")}
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

      <Card title={t("health.title")}>
        {health.isLoading ? <LoadingState /> : null}
        {health.isError ? (
          <ErrorState onRetry={() => void health.refetch()} />
        ) : null}
        {health.data ? (
          <div className="space-y-6">
            <dl className="grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {t("health.status")}
                </dt>
                <dd className="mt-1">
                  <StatusBadge
                    label={
                      health.data.status === "ok"
                        ? t("health.statusOk")
                        : t("health.statusUnknown")
                    }
                    variant={
                      health.data.status === "ok" ? "success" : "warning"
                    }
                  />
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {t("health.modelLoaded")}
                </dt>
                <dd className="mt-1">
                  <StatusBadge
                    label={
                      health.data.model_loaded
                        ? t("health.loadedYes")
                        : t("health.loadedNo")
                    }
                    variant={health.data.model_loaded ? "success" : "neutral"}
                  />
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {t("health.modelReady")}
                </dt>
                <dd className="mt-1">
                  <StatusBadge
                    label={
                      health.data.model_ready
                        ? t("health.readyYes")
                        : t("health.readyNo")
                    }
                    variant={health.data.model_ready ? "success" : "warning"}
                  />
                </dd>
              </div>
            </dl>

            <div>
              <h3 className="mb-3 text-sm font-semibold text-slate-800">
                {t("artifacts.title")}
              </h3>
              <ArtifactStatusList artifacts={health.data.artifacts} />
            </div>
          </div>
        ) : null}
      </Card>

      <MetadataCard />
    </div>
  );
}
