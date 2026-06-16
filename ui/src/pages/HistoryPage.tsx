import { RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ExportHistoryButton } from "@/features/history/components/ExportHistoryButton";
import { PredictionHistoryDetailsDrawer } from "@/features/history/components/PredictionHistoryDetailsDrawer";
import { PredictionHistoryEmptyState } from "@/features/history/components/PredictionHistoryEmptyState";
import { PredictionHistoryErrorState } from "@/features/history/components/PredictionHistoryErrorState";
import { PredictionHistoryFilters } from "@/features/history/components/PredictionHistoryFilters";
import { PredictionHistorySummary } from "@/features/history/components/PredictionHistorySummary";
import { PredictionHistoryTable } from "@/features/history/components/PredictionHistoryTable";
import { useRecentPredictions } from "@/features/history/hooks";
import type { HistoryFilters, NormalizedPredictionRecord } from "@/features/history/types";
import {
  applyHistoryFilters,
  collectModelVersions,
  computeHistorySummary,
} from "@/features/history/utils";
import { LoadingState } from "@/shared/components/LoadingState";

const defaultFilters: HistoryFilters = {
  search: "",
  drift: "all",
  modelVersion: "",
  cpmMin: null,
  cpmMax: null,
  sort: "newest",
};

export function HistoryPage() {
  const { t } = useTranslation();
  const query = useRecentPredictions();
  const [filters, setFilters] = useState<HistoryFilters>(defaultFilters);
  const [selectedRecord, setSelectedRecord] =
    useState<NormalizedPredictionRecord | null>(null);

  const allRecords = query.data ?? [];

  const filteredRecords = useMemo(
    () => applyHistoryFilters(allRecords, filters),
    [allRecords, filters],
  );

  const summary = useMemo(
    () => computeHistorySummary(allRecords),
    [allRecords],
  );

  const modelVersions = useMemo(
    () => collectModelVersions(allRecords),
    [allRecords],
  );

  const isRefreshing = query.isFetching && !query.isLoading;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {t("history.title")}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            {t("history.description")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void query.refetch()}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              aria-hidden
            />
            {t("history.refresh")}
          </button>
          <ExportHistoryButton
            records={filteredRecords}
            disabled={query.isError || query.isLoading}
          />
        </div>
      </div>

      {query.isLoading ? <LoadingState /> : null}

      {query.isError ? (
        <PredictionHistoryErrorState onRetry={() => void query.refetch()} />
      ) : null}

      {query.isSuccess ? (
        <>
          <PredictionHistorySummary summary={summary} />

          {allRecords.length > 0 ? (
            <PredictionHistoryFilters
              filters={filters}
              modelVersions={modelVersions}
              onChange={setFilters}
            />
          ) : null}

          {allRecords.length === 0 ? <PredictionHistoryEmptyState /> : null}

          {allRecords.length > 0 && filteredRecords.length === 0 ? (
            <p className="text-sm text-slate-600" role="status">
              {t("history.noFilterResults")}
            </p>
          ) : null}

          {filteredRecords.length > 0 ? (
            <PredictionHistoryTable
              records={filteredRecords}
              onViewDetails={setSelectedRecord}
            />
          ) : null}
        </>
      ) : null}

      <PredictionHistoryDetailsDrawer
        record={selectedRecord}
        onClose={() => setSelectedRecord(null)}
      />
    </div>
  );
}
