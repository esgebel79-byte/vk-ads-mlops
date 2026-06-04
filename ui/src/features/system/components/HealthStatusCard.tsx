import { useTranslation } from "react-i18next";
import { useHealth } from "../hooks";
import { ArtifactStatusList } from "./ArtifactStatusList";
import { Card } from "@/shared/components/Card";
import { ErrorState } from "@/shared/components/ErrorState";
import { LoadingState } from "@/shared/components/LoadingState";
import { StatusBadge } from "@/shared/components/StatusBadge";

export function HealthStatusCard() {
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch, isFetching } = useHealth();

  return (
    <Card title={t("health.title")}>
      {isLoading || (isFetching && !data) ? <LoadingState /> : null}
      {isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : null}
      {data ? (
        <div className="space-y-5">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {t("health.status")}
              </dt>
              <dd className="mt-1">
                <StatusBadge
                  label={
                    data.status === "ok"
                      ? t("health.statusOk")
                      : t("health.statusUnknown")
                  }
                  variant={data.status === "ok" ? "success" : "warning"}
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
                    data.model_loaded
                      ? t("health.loadedYes")
                      : t("health.loadedNo")
                  }
                  variant={data.model_loaded ? "success" : "neutral"}
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
                    data.model_ready
                      ? t("health.readyYes")
                      : t("health.readyNo")
                  }
                  variant={data.model_ready ? "success" : "warning"}
                />
              </dd>
            </div>
          </dl>

          {data.artifacts ? (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-slate-800">
                {t("health.artifacts")}
              </h3>
              <ArtifactStatusList artifacts={data.artifacts} />
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
