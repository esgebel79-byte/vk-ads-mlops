import type { UseFormRegister, UseFormWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { CampaignFormInput } from "../schema";
import { cn } from "@/shared/lib/cn";

type ForecastPeriodSelectorProps = {
  register: UseFormRegister<CampaignFormInput>;
  watch: UseFormWatch<CampaignFormInput>;
  errorMessage?: string;
  presets: number[];
};

export function ForecastPeriodSelector({
  register,
  watch,
  errorMessage,
  presets,
}: ForecastPeriodSelectorProps) {
  const { t } = useTranslation();
  const selected = watch("forecast_duration_hours");

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-slate-900">
        {t("prediction.form.forecastLabel")}
      </span>
      <p className="text-xs text-slate-500">
        {t("prediction.form.forecastHelper")}
      </p>
      <div className="flex flex-wrap gap-2">
        {presets.map((hours) => (
          <label
            key={hours}
            className={cn(
              "cursor-pointer rounded-lg border px-3 py-2 text-sm font-medium transition",
              selected === hours
                ? "border-brand-500 bg-brand-50 text-brand-800"
                : "border-surface-border bg-white text-slate-700 hover:border-slate-300",
            )}
          >
            <input
              type="radio"
              className="sr-only"
              value={hours}
              {...register("forecast_duration_hours", { valueAsNumber: true })}
            />
            {t("common.hours", { count: hours })}
          </label>
        ))}
      </div>
      {errorMessage ? (
        <p className="text-xs text-rose-600" role="alert">
          {t(`prediction.validation.${errorMessage}`, {
            defaultValue: t("prediction.validation.generic"),
          })}
        </p>
      ) : null}
    </div>
  );
}
