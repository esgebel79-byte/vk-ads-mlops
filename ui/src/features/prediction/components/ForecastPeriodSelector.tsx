import type { UseFormSetValue, UseFormWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { CampaignFormInput } from "../schema";
import { FieldHelp } from "@/shared/components/FieldHelp";
import { cn } from "@/shared/lib/cn";

type ForecastPeriodSelectorProps = {
  watch: UseFormWatch<CampaignFormInput>;
  setValue: UseFormSetValue<CampaignFormInput>;
  errorMessage?: string;
  presets: number[];
};

export function ForecastPeriodSelector({
  watch,
  setValue,
  errorMessage,
  presets,
}: ForecastPeriodSelectorProps) {
  const { t } = useTranslation();
  const selected = watch("forecast_duration_hours");

  const selectDuration = (hours: number) => {
    setValue("forecast_duration_hours", hours, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-medium text-slate-900">
          {t("prediction.form.forecastLabel")}
        </span>
        <FieldHelp text={t("prediction.form.forecastTooltip")} />
      </div>
      <p className="text-xs text-slate-500">
        {t("prediction.form.forecastHelper")}
      </p>
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label={t("prediction.form.forecastLabel")}
      >
        {presets.map((hours) => {
          const isActive = selected === hours;
          return (
            <button
              key={hours}
              type="button"
              aria-pressed={isActive}
              onClick={() => selectDuration(hours)}
              className={cn(
                "rounded-lg border px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-brand-500/30",
                isActive
                  ? "border-brand-500 bg-brand-50 text-brand-800 shadow-sm"
                  : "border-surface-border bg-white text-slate-700 hover:border-slate-300",
              )}
            >
              {t("common.hours", { count: hours })}
            </button>
          );
        })}
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
