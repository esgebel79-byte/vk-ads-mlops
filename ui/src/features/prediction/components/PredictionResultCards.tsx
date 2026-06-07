import { useTranslation } from "react-i18next";
import { formatPercent } from "@/shared/lib/formatters";
import { FieldHelp } from "@/shared/components/FieldHelp";
import type { PredictionResponse } from "../types";
import { cn } from "@/shared/lib/cn";

type PredictionResultCardsProps = {
  response: PredictionResponse;
};

const metrics: Array<{
  key: keyof Pick<
    PredictionResponse,
    "at_least_one" | "at_least_two" | "at_least_three"
  >;
  labelKey: string;
  helperKey: string;
  color: string;
}> = [
  {
    key: "at_least_one",
    labelKey: "prediction.results.atLeastOne",
    helperKey: "prediction.results.atLeastOneHelper",
    color: "bg-brand-500",
  },
  {
    key: "at_least_two",
    labelKey: "prediction.results.atLeastTwo",
    helperKey: "prediction.results.atLeastTwoHelper",
    color: "bg-brand-600",
  },
  {
    key: "at_least_three",
    labelKey: "prediction.results.atLeastThree",
    helperKey: "prediction.results.atLeastThreeHelper",
    color: "bg-brand-700",
  },
];

export function PredictionResultCards({ response }: PredictionResultCardsProps) {
  const { t, i18n } = useTranslation();

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {metrics.map(({ key, labelKey, helperKey, color }) => {
        const value = response[key];
        const pctLabel = formatPercent(value, i18n.language, 1);
        return (
          <article
            key={key}
            className="rounded-xl border border-surface-border bg-surface-card p-4 shadow-card"
          >
            <p className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
              {t(labelKey)}
              <FieldHelp text={t(helperKey)} />
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{pctLabel}</p>
            <div
              className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
              aria-valuenow={Math.round(value * 1000) / 10}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t(labelKey)}
            >
              <div
                className={cn("h-full rounded-full transition-all", color)}
                style={{ width: `${Math.min(100, value * 100)}%` }}
              />
            </div>
          </article>
        );
      })}
    </div>
  );
}
