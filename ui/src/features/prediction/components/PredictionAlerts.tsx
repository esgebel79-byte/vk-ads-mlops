import { AlertTriangle, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { MetadataResponse } from "@/features/system/types";
import type { PredictionResponse } from "../types";
import { resolveCpmAlertKind, type CpmAlertKind } from "../lib/alerts";
import { cn } from "@/shared/lib/cn";

type PredictionAlertsProps = {
  cpm: number;
  metadata?: MetadataResponse;
  metadataError?: boolean;
  response?: PredictionResponse;
  modelReady?: boolean;
  publisherUniverseEmpty?: boolean;
};

type AlertItem = {
  id: string;
  variant: "warning" | "info";
  title: string;
  description: string;
};

function cpmAlertCopy(
  kind: CpmAlertKind,
  t: (key: string) => string,
): Pick<AlertItem, "title" | "description"> | null {
  if (!kind || kind === "thresholds_unavailable") {
    if (kind === "thresholds_unavailable") {
      return {
        title: t("prediction.alerts.cpmThresholdsUnavailableTitle"),
        description: t("prediction.alerts.cpmThresholdsUnavailableDescription"),
      };
    }
    return null;
  }
  const map: Record<
    Exclude<CpmAlertKind, null | "thresholds_unavailable">,
    { title: string; description: string }
  > = {
    guaranteed_win: {
      title: t("prediction.alerts.cpmGuaranteedWinTitle"),
      description: t("prediction.alerts.cpmGuaranteedWinDescription"),
    },
    edge_case: {
      title: t("prediction.alerts.cpmEdgeCaseTitle"),
      description: t("prediction.alerts.cpmEdgeCaseDescription"),
    },
    low_competitiveness: {
      title: t("prediction.alerts.cpmLowTitle"),
      description: t("prediction.alerts.cpmLowDescription"),
    },
  };
  return map[kind];
}

export function PredictionAlerts({
  cpm,
  metadata,
  metadataError,
  response,
  modelReady,
  publisherUniverseEmpty,
}: PredictionAlertsProps) {
  const { t } = useTranslation();
  const alerts: AlertItem[] = [];

  if (modelReady === false) {
    alerts.push({
      id: "model-not-ready",
      variant: "warning",
      title: t("prediction.alerts.modelNotReadyTitle"),
      description: t("prediction.alerts.modelNotReadyDescription"),
    });
  }

  if (metadataError) {
    alerts.push({
      id: "metadata-unavailable",
      variant: "warning",
      title: t("prediction.alerts.metadataUnavailableTitle"),
      description: t("prediction.alerts.metadataUnavailableDescription"),
    });
  }

  if (publisherUniverseEmpty) {
    alerts.push({
      id: "publisher-empty",
      variant: "info",
      title: t("prediction.alerts.publisherEmptyTitle"),
      description: t("prediction.alerts.publisherEmptyDescription"),
    });
  }

  const silenceHours = metadata?.time.session_silence_window_hours;
  if (silenceHours != null && silenceHours > 0) {
    alerts.push({
      id: "session-silence",
      variant: "info",
      title: t("prediction.alerts.sessionSilenceTitle"),
      description: t("prediction.alerts.sessionSilenceDescription", {
        hours: silenceHours,
      }),
    });
  }

  const cpmKind = resolveCpmAlertKind(cpm, metadata?.cpm);
  const cpmCopy = cpmAlertCopy(cpmKind, t);
  if (cpmCopy) {
    alerts.push({
      id: "cpm-threshold",
      variant: cpmKind === "thresholds_unavailable" ? "info" : "warning",
      ...cpmCopy,
    });
  }

  if (response?.drift_flag) {
    alerts.push({
      id: "drift",
      variant: "warning",
      title: t("prediction.alerts.driftTitle"),
      description: t("prediction.alerts.driftDescription"),
    });
  }

  if (alerts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3" role="list">
      {alerts.map((alert) => {
        const Icon = alert.variant === "warning" ? AlertTriangle : Info;
        return (
          <div
            key={alert.id}
            role="listitem"
            className={cn(
              "flex gap-3 rounded-xl border px-4 py-3",
              alert.variant === "warning"
                ? "border-amber-200 bg-amber-50/90"
                : "border-slate-200 bg-slate-50",
            )}
          >
            <Icon
              className={cn(
                "mt-0.5 h-5 w-5 shrink-0",
                alert.variant === "warning" ? "text-amber-600" : "text-slate-500",
              )}
              aria-hidden
            />
            <div>
              <p className="text-sm font-semibold text-slate-900">{alert.title}</p>
              <p className="mt-1 text-sm text-slate-600">{alert.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
