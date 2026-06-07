import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/shared/lib/cn";

type PredictionAlertsProps = {
  metadataError?: boolean;
};

export function PredictionAlerts({ metadataError }: PredictionAlertsProps) {
  const { t } = useTranslation();

  if (!metadataError) {
    return null;
  }

  return (
    <div className="space-y-3" role="list">
      <div
        role="listitem"
        className={cn(
          "flex gap-3 rounded-xl border px-4 py-3",
          "border-amber-200 bg-amber-50/90",
        )}
      >
        <AlertTriangle
          className="mt-0.5 h-5 w-5 shrink-0 text-amber-600"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">
            {t("prediction.alerts.metadataUnavailableTitle")}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {t("prediction.alerts.metadataUnavailableDescription")}
          </p>
        </div>
      </div>
    </div>
  );
}
