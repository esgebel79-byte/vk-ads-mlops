import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useMetadata } from "../hooks";
import type { CpmSource } from "../types";
import { Card } from "@/shared/components/Card";
import { ErrorState } from "@/shared/components/ErrorState";
import { LoadingState } from "@/shared/components/LoadingState";
import { StatusBadge } from "@/shared/components/StatusBadge";
import {
  formatList,
  formatNumber,
  formatOptionalNumber,
} from "@/shared/lib/formatters";

function cpmSourceLabel(
  source: CpmSource,
  t: (key: string) => string,
): string {
  switch (source) {
    case "artifact":
      return t("metadata.cpmSourceArtifact");
    case "config":
      return t("metadata.cpmSourceConfig");
    default:
      return t("metadata.cpmSourceUnavailable");
  }
}

function MetadataRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <dt className="text-sm text-slate-600">{label}</dt>
      <dd className="text-sm font-medium text-slate-900 sm:text-right">
        {value}
      </dd>
    </div>
  );
}

export function MetadataCard() {
  const { t, i18n } = useTranslation();
  const { data, isLoading, isError, refetch, isFetching } = useMetadata();
  const locale = i18n.language;

  return (
    <Card title={t("metadata.title")}>
      {isLoading || (isFetching && !data) ? <LoadingState /> : null}
      {isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : null}
      {data ? (
        <div className="space-y-6">
          <dl className="space-y-3">
            <MetadataRow
              label={t("metadata.modelVersion")}
              value={data.model_version}
            />
            <MetadataRow
              label={t("metadata.modelLoaded")}
              value={
                <StatusBadge
                  label={data.model_loaded ? t("common.yes") : t("common.no")}
                  variant={data.model_loaded ? "success" : "neutral"}
                />
              }
            />
            <MetadataRow
              label={t("metadata.modelReady")}
              value={
                <StatusBadge
                  label={data.model_ready ? t("common.yes") : t("common.no")}
                  variant={data.model_ready ? "success" : "warning"}
                />
              }
            />
            <MetadataRow
              label={t("metadata.publisherUniverse")}
              value={formatNumber(data.publisher_universe.length, locale)}
            />
          </dl>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-800">
              {t("metadata.cpmSection")}
            </h3>
            <dl className="space-y-3">
              <MetadataRow
                label={t("metadata.cpmMin")}
                value={formatNumber(data.cpm.min, locale)}
              />
              <MetadataRow
                label={t("metadata.cpmMax")}
                value={formatNumber(data.cpm.max, locale)}
              />
              <MetadataRow
                label={t("metadata.cpmStep")}
                value={formatNumber(data.cpm.step, locale)}
              />
              <MetadataRow
                label={t("metadata.cpmMedian")}
                value={formatOptionalNumber(
                  data.cpm.median_competitor_cpm,
                  locale,
                  t("metadata.unavailable"),
                )}
              />
              <MetadataRow
                label={t("metadata.cpmMaxCompetitor")}
                value={formatOptionalNumber(
                  data.cpm.max_competitor_cpm,
                  locale,
                  t("metadata.unavailable"),
                )}
              />
              <MetadataRow
                label={t("metadata.cpmSource")}
                value={cpmSourceLabel(data.cpm.source, t)}
              />
            </dl>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-800">
              {t("metadata.timeSection")}
            </h3>
            <dl className="space-y-3">
              <MetadataRow
                label={t("metadata.timeMode")}
                value={data.time.mode}
              />
              <MetadataRow
                label={t("metadata.timeMinHour")}
                value={formatNumber(data.time.min_hour, locale)}
              />
              <MetadataRow
                label={t("metadata.timeMaxHour")}
                value={formatNumber(data.time.max_hour, locale)}
              />
              <MetadataRow
                label={t("metadata.timePresets")}
                value={formatList(data.time.recommended_presets, locale)}
              />
              <MetadataRow
                label={t("metadata.timeSilence")}
                value={formatNumber(
                  data.time.session_silence_window_hours,
                  locale,
                  { maximumFractionDigits: 2 },
                )}
              />
            </dl>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-800">
              {t("metadata.limitsSection")}
            </h3>
            <dl className="space-y-3">
              <MetadataRow
                label={t("metadata.maxSweepPoints")}
                value={formatNumber(data.limits.max_sweep_points, locale)}
              />
              <MetadataRow
                label={t("metadata.maxRecentPredictions")}
                value={formatNumber(
                  data.limits.max_recent_predictions,
                  locale,
                )}
              />
            </dl>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
