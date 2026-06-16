import { useTranslation } from "react-i18next";
import type { HistoryDriftFilter, HistoryFilters, HistorySortKey } from "../types";

type PredictionHistoryFiltersProps = {
  filters: HistoryFilters;
  modelVersions: string[];
  onChange: (next: HistoryFilters) => void;
};

const driftOptions: HistoryDriftFilter[] = ["all", "drift", "no_drift"];

const sortOptions: HistorySortKey[] = [
  "newest",
  "oldest",
  "cpm_high",
  "cpm_low",
  "reach_high",
  "latency_low",
];

export function PredictionHistoryFilters({
  filters,
  modelVersions,
  onChange,
}: PredictionHistoryFiltersProps) {
  const { t } = useTranslation();

  const update = (patch: Partial<HistoryFilters>) => {
    onChange({ ...filters, ...patch });
  };

  return (
    <div className="rounded-xl border border-surface-border bg-surface-card p-4 shadow-card">
      <h2 className="text-sm font-semibold text-slate-900">
        {t("history.filters.title")}
      </h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-slate-700">
            {t("history.filters.search")}
          </span>
          <input
            type="search"
            value={filters.search}
            onChange={(e) => update({ search: e.target.value })}
            placeholder={t("history.filters.searchPlaceholder")}
            className="rounded-lg border border-surface-border px-3 py-2 text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-slate-700">
            {t("history.filters.drift")}
          </span>
          <select
            value={filters.drift}
            onChange={(e) =>
              update({ drift: e.target.value as HistoryDriftFilter })
            }
            className="rounded-lg border border-surface-border px-3 py-2 text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {driftOptions.map((option) => (
              <option key={option} value={option}>
                {t(`history.filters.drift_${option}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-slate-700">
            {t("history.filters.modelVersion")}
          </span>
          <select
            value={filters.modelVersion}
            onChange={(e) => update({ modelVersion: e.target.value })}
            className="rounded-lg border border-surface-border px-3 py-2 text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">{t("history.filters.allVersions")}</option>
            {modelVersions.map((version) => (
              <option key={version} value={version}>
                {version}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-slate-700">
            {t("history.filters.cpmMin")}
          </span>
          <input
            type="number"
            min={0}
            step="any"
            value={filters.cpmMin ?? ""}
            onChange={(e) => {
              const raw = e.target.value;
              update({
                cpmMin: raw === "" ? null : Number(raw),
              });
            }}
            className="rounded-lg border border-surface-border px-3 py-2 text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-slate-700">
            {t("history.filters.cpmMax")}
          </span>
          <input
            type="number"
            min={0}
            step="any"
            value={filters.cpmMax ?? ""}
            onChange={(e) => {
              const raw = e.target.value;
              update({
                cpmMax: raw === "" ? null : Number(raw),
              });
            }}
            className="rounded-lg border border-surface-border px-3 py-2 text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-slate-700">
            {t("history.filters.sort")}
          </span>
          <select
            value={filters.sort}
            onChange={(e) =>
              update({ sort: e.target.value as HistorySortKey })
            }
            className="rounded-lg border border-surface-border px-3 py-2 text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {sortOptions.map((option) => (
              <option key={option} value={option}>
                {t(`history.filters.sort_${option}`)}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
