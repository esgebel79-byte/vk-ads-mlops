import type { UseFormRegister } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { CampaignFormInput } from "../schema";
import { FieldHelp } from "@/shared/components/FieldHelp";
import { cn } from "@/shared/lib/cn";

type CpmInputProps = {
  register: UseFormRegister<CampaignFormInput>;
  errorMessage?: string;
  min?: number;
  max?: number;
  step?: number;
};

export function CpmInput({ register, errorMessage, min, max, step }: CpmInputProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <label htmlFor="cpm" className="text-sm font-medium text-slate-900">
          {t("prediction.form.cpmLabel")}
        </label>
        <FieldHelp text={t("prediction.form.cpmTooltip")} />
      </div>
      <input
        id="cpm"
        type="number"
        step={step ?? 0.1}
        min={min ?? 0}
        max={max}
        className={cn(
          "w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm transition",
          "focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20",
          errorMessage
            ? "border-rose-300"
            : "border-surface-border hover:border-slate-300",
        )}
        {...register("cpm", { valueAsNumber: true })}
      />
      <p className="text-xs text-slate-500">{t("prediction.form.cpmHelper")}</p>
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
