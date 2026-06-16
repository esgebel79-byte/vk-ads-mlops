import { useTranslation } from "react-i18next";
import type { CpmMetadata } from "@/features/system/types";
import { areCpmThresholdsAvailable } from "../lib/auctionIntelligence";
import { formatOptionalNumber } from "@/shared/lib/formatters";
import { cn } from "@/shared/lib/cn";

type AuctionThresholdMarkersProps = {
  cpmMeta: CpmMetadata | undefined;
  chartMin: number;
  chartMax: number;
  className?: string;
};

export function AuctionThresholdMarkers({
  cpmMeta,
  chartMin,
  chartMax,
  className,
}: AuctionThresholdMarkersProps) {
  const { t, i18n } = useTranslation();
  const unavailableLabel = t("metadata.unavailable");

  if (!areCpmThresholdsAvailable(cpmMeta)) {
    return (
      <p className={cn("text-xs text-slate-500", className)} role="note">
        {t("prediction.sweep.thresholds.unavailableNotice")}
      </p>
    );
  }

  const median = cpmMeta!.median_competitor_cpm!;
  const max = cpmMeta!.max_competitor_cpm!;
  const span = Math.max(chartMax - chartMin, 1);

  const medianLeft = `${((median - chartMin) / span) * 100}%`;
  const maxLeft = `${((max - chartMin) / span) * 100}%`;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="relative h-8 rounded-lg bg-slate-100">
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-amber-500"
          style={{ left: medianLeft }}
          title={t("prediction.sweep.thresholds.medianLabel")}
          aria-hidden
        />
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-rose-500"
          style={{ left: maxLeft }}
          title={t("prediction.sweep.thresholds.maxLabel")}
          aria-hidden
        />
      </div>
      <dl className="grid gap-2 text-xs sm:grid-cols-2">
        <div className="flex gap-2">
          <span
            className="mt-1 h-3 w-3 shrink-0 rounded-sm bg-amber-500"
            aria-hidden
          />
          <div>
            <dt className="font-medium text-slate-900">
              {t("prediction.sweep.thresholds.medianLabel")}
            </dt>
            <dd className="text-slate-600">
              {formatOptionalNumber(median, i18n.language, unavailableLabel)}
              {" — "}
              {t("prediction.sweep.thresholds.medianDescription")}
            </dd>
          </div>
        </div>
        <div className="flex gap-2">
          <span
            className="mt-1 h-3 w-3 shrink-0 rounded-sm bg-rose-500"
            aria-hidden
          />
          <div>
            <dt className="font-medium text-slate-900">
              {t("prediction.sweep.thresholds.maxLabel")}
            </dt>
            <dd className="text-slate-600">
              {formatOptionalNumber(max, i18n.language, unavailableLabel)}
              {" — "}
              {t("prediction.sweep.thresholds.maxDescription")}
            </dd>
          </div>
        </div>
      </dl>
    </div>
  );
}
