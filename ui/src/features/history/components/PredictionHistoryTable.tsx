import type { ReactNode } from "react";
import { Eye } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  formatDateTime,
  formatNumber,
  formatOptionalNumber,
  formatPercent,
} from "@/shared/lib/formatters";
import { StatusBadge } from "@/shared/components/StatusBadge";
import type { NormalizedPredictionRecord } from "../types";
import {
  getPredictionCpm,
  getPredictionDuration,
  getPredictionReach,
  hasDriftWarning,
} from "../utils";

type PredictionHistoryTableProps = {
  records: NormalizedPredictionRecord[];
  onViewDetails: (record: NormalizedPredictionRecord) => void;
};

type RowProps = {
  record: NormalizedPredictionRecord;
  onViewDetails: (record: NormalizedPredictionRecord) => void;
};

function CellValue({
  children,
}: {
  children: ReactNode;
}) {
  return <span className="text-slate-900">{children}</span>;
}

export function PredictionHistoryTable({
  records,
  onViewDetails,
}: PredictionHistoryTableProps) {
  const { t } = useTranslation();

  if (records.length === 0) {
    return null;
  }

  return (
    <>
      <div className="hidden overflow-x-auto rounded-xl border border-surface-border bg-surface-card shadow-card md:block">
        <table className="min-w-full divide-y divide-surface-border text-sm">
          <thead className="bg-slate-50">
            <tr>
              {[
                "predictionId",
                "time",
                "cpm",
                "duration",
                "audience",
                "reach",
                "atLeastOne",
                "drift",
                "latency",
                "modelVersion",
                "actions",
              ].map((key) => (
                <th
                  key={key}
                  scope="col"
                  className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  {t(`history.table.${key}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {records.map((record) => (
              <HistoryTableRow
                key={record.id}
                record={record}
                onViewDetails={onViewDetails}
              />
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 md:hidden">
        {records.map((record) => (
          <HistoryMobileCard
            key={record.id}
            record={record}
            onViewDetails={onViewDetails}
          />
        ))}
      </ul>
    </>
  );
}

function HistoryTableRow({ record, onViewDetails }: RowProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const unavailable = t("history.unavailable");
  const cpm = getPredictionCpm(record);
  const duration = getPredictionDuration(record);
  const reach = getPredictionReach(record);
  const prob = record.response?.at_least_one;

  return (
    <tr className="hover:bg-slate-50/80">
      <td className="max-w-[10rem] truncate px-4 py-3 font-mono text-xs">
        {record.predictionId ?? unavailable}
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        {record.createdAt
          ? formatDateTime(record.createdAt, locale)
          : unavailable}
      </td>
      <td className="px-4 py-3">
        {cpm != null ? formatNumber(cpm, locale) : unavailable}
      </td>
      <td className="px-4 py-3">
        {duration != null
          ? t("common.hours", { count: duration })
          : unavailable}
      </td>
      <td className="px-4 py-3">
        {record.request?.audience_size != null
          ? formatNumber(record.request.audience_size, locale)
          : unavailable}
      </td>
      <td className="px-4 py-3">
        {reach != null ? formatNumber(reach, locale) : unavailable}
      </td>
      <td className="px-4 py-3">
        {prob != null ? formatPercent(prob, locale) : unavailable}
      </td>
      <td className="px-4 py-3">
        <StatusBadge
          label={
            hasDriftWarning(record)
              ? t("history.drift.yes")
              : record.driftFlag === false
                ? t("history.drift.no")
                : unavailable
          }
          variant={hasDriftWarning(record) ? "warning" : "neutral"}
        />
      </td>
      <td className="px-4 py-3">
        {record.latencySeconds != null
          ? `${formatOptionalNumber(record.latencySeconds, locale, unavailable)} s`
          : unavailable}
      </td>
      <td className="max-w-[8rem] truncate px-4 py-3">
        {record.modelVersion ?? unavailable}
      </td>
      <td className="px-4 py-3">
        <button
          type="button"
          onClick={() => onViewDetails(record)}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-brand-700 hover:bg-brand-50"
        >
          <Eye className="h-4 w-4" aria-hidden />
          {t("history.table.viewDetails")}
        </button>
      </td>
    </tr>
  );
}

function HistoryMobileCard({ record, onViewDetails }: RowProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const unavailable = t("history.unavailable");
  const cpm = getPredictionCpm(record);
  const reach = getPredictionReach(record);

  return (
    <li className="rounded-xl border border-surface-border bg-surface-card p-4 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <p className="font-mono text-xs text-slate-700">
          {record.predictionId ?? unavailable}
        </p>
        <StatusBadge
          label={
            hasDriftWarning(record)
              ? t("history.drift.yes")
              : t("history.drift.no")
          }
          variant={hasDriftWarning(record) ? "warning" : "neutral"}
        />
      </div>
      <p className="mt-2 text-sm text-slate-600">
        {record.createdAt
          ? formatDateTime(record.createdAt, locale)
          : unavailable}
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-slate-500">{t("history.table.cpm")}</dt>
          <dd>
            <CellValue>
              {cpm != null ? formatNumber(cpm, locale) : unavailable}
            </CellValue>
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">{t("history.table.reach")}</dt>
          <dd>
            <CellValue>
              {reach != null ? formatNumber(reach, locale) : unavailable}
            </CellValue>
          </dd>
        </div>
      </dl>
      <button
        type="button"
        onClick={() => onViewDetails(record)}
        className="mt-4 inline-flex w-full items-center justify-center gap-1 rounded-lg border border-surface-border py-2 text-sm font-medium text-brand-700"
      >
        <Eye className="h-4 w-4" aria-hidden />
        {t("history.table.viewDetails")}
      </button>
    </li>
  );
}
