import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { CpmMetadata } from "@/features/system/types";
import {
  resolveWinProbability,
  type WinProbabilityState,
} from "../lib/auctionIntelligence";
import { Card } from "@/shared/components/Card";
import { FieldHelp } from "@/shared/components/FieldHelp";
import { StatusBadge, type StatusVariant } from "@/shared/components/StatusBadge";
import { cn } from "@/shared/lib/cn";

type WinProbabilityIndicatorProps = {
  cpm: number;
  cpmMeta: CpmMetadata | undefined;
};

type StatePresentation = {
  badgeVariant: StatusVariant;
  badgeKey: string;
  descriptionKey: string;
  barClass: string;
  barWidth: string;
};

const statePresentation: Record<WinProbabilityState, StatePresentation> = {
  guaranteed: {
    badgeVariant: "success",
    badgeKey: "prediction.winProbability.statusGuaranteed",
    descriptionKey: "prediction.winProbability.descriptionGuaranteed",
    barClass: "bg-emerald-500",
    barWidth: "100%",
  },
  edge: {
    badgeVariant: "warning",
    badgeKey: "prediction.winProbability.statusEdge",
    descriptionKey: "prediction.winProbability.descriptionEdge",
    barClass: "bg-amber-500",
    barWidth: "50%",
  },
  low: {
    badgeVariant: "warning",
    badgeKey: "prediction.winProbability.statusLow",
    descriptionKey: "prediction.winProbability.descriptionLow",
    barClass: "bg-amber-400",
    barWidth: "25%",
  },
  unknown: {
    badgeVariant: "neutral",
    badgeKey: "prediction.winProbability.statusUnknown",
    descriptionKey: "prediction.winProbability.descriptionUnknown",
    barClass: "bg-slate-300",
    barWidth: "0%",
  },
  neutral: {
    badgeVariant: "info",
    badgeKey: "prediction.winProbability.statusNeutral",
    descriptionKey: "prediction.winProbability.descriptionNeutral",
    barClass: "bg-brand-500",
    barWidth: "65%",
  },
};

export function WinProbabilityIndicator({
  cpm,
  cpmMeta,
}: WinProbabilityIndicatorProps) {
  const { t } = useTranslation();

  const result = useMemo(
    () => resolveWinProbability(cpm, cpmMeta),
    [cpm, cpmMeta],
  );

  const presentation = statePresentation[result.state];

  return (
    <Card
      title={
        <span className="inline-flex items-center gap-1.5">
          {t("prediction.winProbability.title")}
          <FieldHelp text={t("prediction.winProbability.help")} />
        </span>
      }
      description={t("prediction.winProbability.subtitle")}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <StatusBadge
            label={t(presentation.badgeKey)}
            variant={presentation.badgeVariant}
          />
          {result.displayPercent != null ? (
            <p
              className="text-2xl font-semibold tabular-nums text-slate-900"
              aria-label={t("prediction.winProbability.percentLabel", {
                percent: result.displayPercent,
              })}
            >
              {t("prediction.winProbability.percentLabel", {
                percent: result.displayPercent,
              })}
            </p>
          ) : null}
        </div>

        <div
          className="h-2.5 overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={result.displayPercent ?? 0}
          aria-label={t("prediction.winProbability.title")}
        >
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              presentation.barClass,
            )}
            style={{ width: presentation.barWidth }}
          />
        </div>

        <p className="text-sm text-slate-600">
          {t(presentation.descriptionKey)}
        </p>
      </div>
    </Card>
  );
}
