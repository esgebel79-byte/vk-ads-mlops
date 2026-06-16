import { useTranslation } from "react-i18next";
import { useHealth, useMetadata } from "../hooks";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { LoadingState } from "@/shared/components/LoadingState";

export function DashboardStatusStrip() {
  const { t } = useTranslation();
  const health = useHealth();
  const metadata = useMetadata();

  const isLoading =
    (health.isLoading && !health.data) || (metadata.isLoading && !metadata.data);

  const modelReady =
    health.data?.model_ready ?? metadata.data?.model_ready;
  const publisherCount = metadata.data?.publisher_universe.length;

  const segmentLabel = (() => {
    if (publisherCount === undefined) {
      return t("dashboard.statusStrip.segmentsUnknown");
    }
    if (publisherCount === 0) {
      return t("dashboard.statusStrip.segmentsLimited");
    }
    return t("dashboard.statusStrip.segmentsAvailable", {
      count: publisherCount,
    });
  })();

  const segmentVariant =
    publisherCount === undefined
      ? "neutral"
      : publisherCount === 0
        ? "warning"
        : "success";

  return (
    <section
      className="rounded-xl border border-surface-border bg-surface-card px-5 py-4 shadow-card"
      aria-label={t("dashboard.statusStrip.ariaLabel")}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {t("dashboard.statusStrip.title")}
      </p>

      {isLoading ? (
        <div className="mt-3">
          <LoadingState />
        </div>
      ) : (
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs font-medium text-slate-500">
              {t("dashboard.statusStrip.serviceStatus")}
            </dt>
            <dd className="mt-1.5">
              <StatusBadge
                label={
                  health.data?.status === "ok"
                    ? t("health.statusOk")
                    : health.isError
                      ? t("api.disconnected")
                      : t("health.statusUnknown")
                }
                variant={
                  health.data?.status === "ok" ? "success" : "warning"
                }
              />
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">
              {t("dashboard.statusStrip.modelVersion")}
            </dt>
            <dd className="mt-1.5 text-sm font-medium text-slate-900">
              {metadata.data?.model_version ?? t("history.unavailable")}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">
              {t("dashboard.statusStrip.predictionReadiness")}
            </dt>
            <dd className="mt-1.5">
              {modelReady === undefined ? (
                <span className="text-sm text-slate-600">
                  {t("history.unavailable")}
                </span>
              ) : (
                <StatusBadge
                  label={
                    modelReady
                      ? t("health.readyYes")
                      : t("health.readyNo")
                  }
                  variant={modelReady ? "success" : "warning"}
                />
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">
              {t("dashboard.statusStrip.segmentAvailability")}
            </dt>
            <dd className="mt-1.5">
              <StatusBadge label={segmentLabel} variant={segmentVariant} />
            </dd>
          </div>
        </dl>
      )}

      <p className="mt-3 text-xs text-slate-500">
        {t("dashboard.statusStrip.hint", {
          link: t("nav.systemStatus"),
        })}
      </p>
    </section>
  );
}
