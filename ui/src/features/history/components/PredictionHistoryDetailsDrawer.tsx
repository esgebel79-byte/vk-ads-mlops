import { X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { PredictionResultCards } from "@/features/prediction/components/PredictionResultCards";
import {
  formatDateTime,
  formatNumber,
  formatOptionalNumber,
  formatPercent,
} from "@/shared/lib/formatters";
import { StatusBadge } from "@/shared/components/StatusBadge";
import type { NormalizedPredictionRecord } from "../types";
import {
  getPredictionDuration,
  getPredictionReach,
  hasDriftWarning,
} from "../utils";

type PredictionHistoryDetailsDrawerProps = {
  record: NormalizedPredictionRecord | null;
  onClose: () => void;
};

export function PredictionHistoryDetailsDrawer({
  record,
  onClose,
}: PredictionHistoryDetailsDrawerProps) {
  const { t, i18n } = useTranslation();
  const [showTechnical, setShowTechnical] = useState(false);
  const locale = i18n.language;
  const unavailable = t("history.unavailable");

  if (!record) {
    return null;
  }

  const req = record.request;
  const res = record.response;
  const reach = getPredictionReach(record);

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-slate-900/40"
        aria-label={t("history.details.close")}
        onClick={onClose}
      />
      <aside
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-surface-border bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-details-title"
      >
        <header className="flex items-start justify-between gap-3 border-b border-surface-border px-5 py-4">
          <div>
            <h2
              id="history-details-title"
              className="text-lg font-semibold text-slate-900"
            >
              {t("history.details.title")}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {record.predictionId ?? unavailable}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            aria-label={t("history.details.close")}
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">{t("history.table.time")}</dt>
              <dd className="font-medium text-slate-900">
                {record.createdAt
                  ? formatDateTime(record.createdAt, locale)
                  : unavailable}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">{t("history.table.latency")}</dt>
              <dd className="font-medium text-slate-900">
                {record.latencySeconds != null
                  ? `${formatOptionalNumber(record.latencySeconds, locale, unavailable)} s`
                  : unavailable}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">{t("history.table.modelVersion")}</dt>
              <dd className="font-medium text-slate-900">
                {record.modelVersion ?? unavailable}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">{t("history.table.drift")}</dt>
              <dd className="mt-0.5">
                <StatusBadge
                  label={
                    hasDriftWarning(record)
                      ? t("history.drift.yes")
                      : record.driftFlag === false
                        ? t("history.drift.no")
                        : unavailable
                  }
                  variant={hasDriftWarning(record) ? "warning" : "success"}
                />
              </dd>
            </div>
          </dl>

          <section>
            <h3 className="text-sm font-semibold text-slate-800">
              {t("history.details.requestTitle")}
            </h3>
            {req ? (
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500">{t("history.table.cpm")}</dt>
                  <dd className="font-medium">{formatNumber(req.cpm, locale)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">
                    {t("history.table.duration")}
                  </dt>
                  <dd className="font-medium">
                    {getPredictionDuration(record) != null
                      ? t("common.hours", {
                          count: getPredictionDuration(record) ?? 0,
                        })
                      : unavailable}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">
                    {t("history.table.audience")}
                  </dt>
                  <dd className="font-medium">
                    {formatNumber(req.audience_size, locale)}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">
                    {t("history.details.hourWindow")}
                  </dt>
                  <dd className="font-medium">
                    {formatNumber(req.hour_start, locale)} –{" "}
                    {formatNumber(req.hour_end, locale)}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-slate-500">
                    {t("history.details.publishers")}
                  </dt>
                  <dd className="font-medium">
                    {req.publishers.length > 0
                      ? req.publishers.join(", ")
                      : t("history.details.noPublishers")}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="mt-2 text-sm text-slate-600">{unavailable}</p>
            )}
          </section>

          <section>
            <h3 className="text-sm font-semibold text-slate-800">
              {t("history.details.responseTitle")}
            </h3>
            {res ? (
              <div className="mt-3 space-y-4">
                <p className="text-sm text-slate-600">
                  {t("history.details.reachExplanation")}
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {reach != null
                    ? formatNumber(reach, locale)
                    : unavailable}
                  <span className="ml-2 text-sm font-medium text-slate-500">
                    {t("history.table.reach")}
                  </span>
                </p>
                {res.at_least_one != null ? (
                  <p className="text-sm text-slate-600">
                    {t("prediction.results.atLeastOne")}:{" "}
                    {formatPercent(res.at_least_one, locale)}
                  </p>
                ) : null}
                <PredictionResultCards response={res} />
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-600">{unavailable}</p>
            )}
          </section>

          <section>
            <button
              type="button"
              onClick={() => setShowTechnical((v) => !v)}
              className="text-sm font-medium text-brand-700 hover:text-brand-800"
              aria-expanded={showTechnical}
            >
              {t("history.details.technicalToggle")}
            </button>
            {showTechnical ? (
              <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-100">
                {JSON.stringify(record, null, 2)}
              </pre>
            ) : null}
          </section>
        </div>
      </aside>
    </>
  );
}
