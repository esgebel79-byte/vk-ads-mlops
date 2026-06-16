import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CpmMetadata } from "@/features/system/types";
import type { CpmSweepPoint, SweepChartMode } from "../types";
import { areCpmThresholdsAvailable } from "../lib/auctionIntelligence";
import { AuctionThresholdMarkers } from "./AuctionThresholdMarkers";
import { EmptyState } from "@/shared/components/EmptyState";
import { LoadingState } from "@/shared/components/LoadingState";
import { formatNumber, formatPercent } from "@/shared/lib/formatters";
import { cn } from "@/shared/lib/cn";

type CpmSweepChartProps = {
  points?: CpmSweepPoint[];
  cpmMeta?: CpmMetadata;
  isLoading?: boolean;
  emptyDescription?: string;
};

type ChartRow = CpmSweepPoint & {
  reachLabel: string;
};

export function CpmSweepChart({
  points,
  cpmMeta,
  isLoading = false,
  emptyDescription,
}: CpmSweepChartProps) {
  const { t, i18n } = useTranslation();
  const [mode, setMode] = useState<SweepChartMode>("reach");

  const chartData = useMemo<ChartRow[]>(
    () =>
      (points ?? []).map((p) => ({
        ...p,
        reachLabel: formatNumber(p.predicted_reach, i18n.language, {
          maximumFractionDigits: 0,
        }),
      })),
    [points, i18n.language],
  );

  const chartBounds = useMemo(() => {
    if (!points?.length) {
      return { min: 0, max: 100 };
    }
    const cpms = points.map((p) => p.cpm);
    const min = Math.min(...cpms);
    const max = Math.max(...cpms);
    const padding = Math.max((max - min) * 0.05, 1);
    return { min: min - padding, max: max + padding };
  }, [points]);

  const thresholdsAvailable = areCpmThresholdsAvailable(cpmMeta);

  if (isLoading) {
    return <LoadingState label={t("prediction.sweep.chart.loading")} />;
  }

  if (!points?.length) {
    return (
      <EmptyState
        title={t("prediction.sweep.chart.emptyTitle")}
        description={
          emptyDescription ?? t("prediction.sweep.chart.emptyDescription")
        }
      />
    );
  }

  const modeButtonClass = (active: boolean) =>
    cn(
      "rounded-md px-3 py-1.5 text-xs font-medium transition",
      active
        ? "bg-brand-600 text-white shadow-sm"
        : "bg-white text-slate-600 hover:bg-slate-100",
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-900">
          {t("prediction.sweep.chart.title")}
        </p>
        <div
          className="inline-flex rounded-lg border border-surface-border p-0.5"
          role="group"
          aria-label={t("prediction.sweep.chart.modeToggleLabel")}
        >
          <button
            type="button"
            className={modeButtonClass(mode === "reach")}
            onClick={() => setMode("reach")}
          >
            {t("prediction.sweep.chart.modeReach")}
          </button>
          <button
            type="button"
            className={modeButtonClass(mode === "probabilities")}
            onClick={() => setMode("probabilities")}
          >
            {t("prediction.sweep.chart.modeProbabilities")}
          </button>
        </div>
      </div>

      <div className="h-72 w-full min-w-0 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="cpm"
              type="number"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(v: number) =>
                formatNumber(v, i18n.language, { maximumFractionDigits: 1 })
              }
              label={{
                value: t("prediction.sweep.chart.axisCpm"),
                position: "insideBottom",
                offset: -4,
                style: { fill: "#64748b", fontSize: 12 },
              }}
            />
            <YAxis
              tickFormatter={(v: number) =>
                mode === "reach"
                  ? formatNumber(v, i18n.language, { maximumFractionDigits: 0 })
                  : formatPercent(v, i18n.language)
              }
              label={{
                value:
                  mode === "reach"
                    ? t("prediction.sweep.chart.axisReach")
                    : t("prediction.sweep.chart.axisProbability"),
                angle: -90,
                position: "insideLeft",
                style: { fill: "#64748b", fontSize: 12 },
              }}
            />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === "predicted_reach") {
                  return [
                    formatNumber(value, i18n.language, {
                      maximumFractionDigits: 0,
                    }),
                    t("prediction.sweep.chart.tooltipReach"),
                  ];
                }
                const labelMap: Record<string, string> = {
                  at_least_one: t("prediction.sweep.chart.tooltipAtLeastOne"),
                  at_least_two: t("prediction.sweep.chart.tooltipAtLeastTwo"),
                  at_least_three: t(
                    "prediction.sweep.chart.tooltipAtLeastThree",
                  ),
                };
                return [
                  formatPercent(value, i18n.language),
                  labelMap[name] ?? name,
                ];
              }}
              labelFormatter={(cpm: number) =>
                `${t("prediction.sweep.chart.tooltipCpm")}: ${formatNumber(cpm, i18n.language, { maximumFractionDigits: 2 })}`
              }
            />
            {mode === "reach" ? (
              <Line
                type="monotone"
                dataKey="predicted_reach"
                name="predicted_reach"
                stroke="#2563eb"
                strokeWidth={2}
                dot={{ r: 3, fill: "#2563eb" }}
                activeDot={{ r: 5 }}
              />
            ) : (
              <>
                <Line
                  type="monotone"
                  dataKey="at_least_one"
                  name="at_least_one"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="at_least_two"
                  name="at_least_two"
                  stroke="#7c3aed"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="at_least_three"
                  name="at_least_three"
                  stroke="#059669"
                  strokeWidth={2}
                  dot={false}
                />
                <Legend />
              </>
            )}
            {thresholdsAvailable && cpmMeta?.median_competitor_cpm != null ? (
              <ReferenceLine
                x={cpmMeta.median_competitor_cpm}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{
                  value: t("prediction.sweep.thresholds.medianShort"),
                  position: "top",
                  fill: "#b45309",
                  fontSize: 11,
                }}
              />
            ) : null}
            {thresholdsAvailable && cpmMeta?.max_competitor_cpm != null ? (
              <ReferenceLine
                x={cpmMeta.max_competitor_cpm}
                stroke="#e11d48"
                strokeDasharray="4 4"
                label={{
                  value: t("prediction.sweep.thresholds.maxShort"),
                  position: "top",
                  fill: "#be123c",
                  fontSize: 11,
                }}
              />
            ) : null}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <AuctionThresholdMarkers
        cpmMeta={cpmMeta}
        chartMin={chartBounds.min}
        chartMax={chartBounds.max}
      />
    </div>
  );
}
