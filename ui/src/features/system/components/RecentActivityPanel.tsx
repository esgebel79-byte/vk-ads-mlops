import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useRecentPredictions } from "@/features/history/hooks";
import { computeHistorySummary } from "@/features/history/utils";
import { Card } from "@/shared/components/Card";
import { ErrorState } from "@/shared/components/ErrorState";
import { LoadingState } from "@/shared/components/LoadingState";
import {
  formatDateTime,
  formatNumber,
  formatOptionalNumber,
} from "@/shared/lib/formatters";

export function RecentActivityPanel() {
  const { t, i18n } = useTranslation();
  const query = useRecentPredictions();
  const locale = i18n.language;
  const unavailable = t("history.unavailable");

  const summary = query.data
    ? computeHistorySummary(query.data)
    : null;

  return (
    <Card
      title={t("systemAnalytics.recentActivityTitle")}
      description={t("systemAnalytics.recentActivityDescription")}
      action={
        <Link
          to="/history"
          className="text-sm font-medium text-brand-700 hover:text-brand-800"
        >
          {t("systemAnalytics.viewHistory")}
        </Link>
      }
    >
      {query.isLoading ? <LoadingState /> : null}
      {query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : null}
      {query.isSuccess && summary ? (
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {t("systemAnalytics.recentPredictionCount")}
            </dt>
            <dd className="mt-1 text-lg font-semibold text-slate-900">
              {formatNumber(summary.total, locale)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {t("systemAnalytics.avgLatency")}
            </dt>
            <dd className="mt-1 text-lg font-semibold text-slate-900">
              {summary.averageLatencySeconds != null
                ? `${formatOptionalNumber(summary.averageLatencySeconds, locale, unavailable)} s`
                : unavailable}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {t("systemAnalytics.driftWarnings")}
            </dt>
            <dd className="mt-1 text-lg font-semibold text-slate-900">
              {formatNumber(summary.driftWarningCount, locale)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {t("systemAnalytics.lastPrediction")}
            </dt>
            <dd className="mt-1 text-sm font-semibold text-slate-900">
              {summary.latestPredictionAt
                ? formatDateTime(summary.latestPredictionAt, locale)
                : unavailable}
            </dd>
          </div>
        </dl>
      ) : null}
      {query.isSuccess && summary?.total === 0 ? (
        <p className="text-sm text-slate-600">{t("history.empty.description")}</p>
      ) : null}
    </Card>
  );
}
