import { Download } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { NormalizedPredictionRecord } from "../types";
import { downloadCsvFile, exportHistoryToCsv } from "../utils";

type ExportHistoryButtonProps = {
  records: NormalizedPredictionRecord[];
  disabled?: boolean;
};

export function ExportHistoryButton({
  records,
  disabled = false,
}: ExportHistoryButtonProps) {
  const { t } = useTranslation();

  const handleExport = () => {
    if (records.length === 0) {
      return;
    }
    const csv = exportHistoryToCsv(records);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsvFile(`prediction-history-${stamp}.csv`, csv);
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={disabled || records.length === 0}
      className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Download className="h-4 w-4" aria-hidden />
      {t("history.exportCsv")}
    </button>
  );
}
