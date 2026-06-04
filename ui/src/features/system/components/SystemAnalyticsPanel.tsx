import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useRecentPredictions } from "@/features/history/hooks";
import { computeHistorySummary } from "@/features/history/utils";
import { useHealth, useMetadata } from "../hooks";
import { SystemOverviewGrid } from "./SystemOverviewGrid";
import { Card } from "@/shared/components/Card";
import { ErrorState } from "@/shared/components/ErrorState";
import { LoadingState } from "@/shared/components/LoadingState";
import { StatusBadge } from "@/shared/components/StatusBadge";

export function SystemAnalyticsPanel() {
  const { t } = useTranslation();
  const health = useHealth();
  const metadata = useMetadata();
  const recent = useRecentPredictions();

  const historySummary = useMemo(
    () => (recent.data ? computeHistorySummary(recent.data) : null),
    [recent.data],
  );

  return (
    <Card title={t("systemAnalytics.panelTitle")}>
      {health.isLoading && !health.data ? <LoadingState /> : null}
      {health.isError ? (
        <ErrorState onRetry={() => void health.refetch()} />
      ) : null}
      {health.data ? (
        <div className="mb-6 space-y-4">
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
        </div>
      ) : null}

      <SystemOverviewGrid
        health={health.data}
        metadata={metadata.data}
        healthConnected={health.isSuccess}
        healthLoading={health.isLoading}
        historySummary={historySummary}
      />
    </Card>
  );
}
