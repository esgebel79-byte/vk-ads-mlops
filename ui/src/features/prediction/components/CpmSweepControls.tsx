import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { MetadataResponse } from "@/features/system/types";
import {
  createCpmSweepControlsSchema,
  getDefaultSweepControls,
  type CpmSweepControlsInput,
} from "../schema";
import { DEFAULT_MAX_SWEEP_POINTS } from "../types";
import { cn } from "@/shared/lib/cn";

type CpmSweepControlsProps = {
  metadata?: MetadataResponse;
  isRunning: boolean;
  onRun: (range: CpmSweepControlsInput) => void;
  onReset: () => void;
};

const buttonPrimary =
  "inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:cursor-not-allowed disabled:opacity-60";
const buttonSecondary =
  "inline-flex items-center justify-center rounded-lg border border-surface-border bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-slate-300/50 disabled:cursor-not-allowed disabled:opacity-60";

const fieldClass = (hasError: boolean) =>
  cn(
    "w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm",
    "focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20",
    hasError ? "border-rose-300" : "border-surface-border",
  );

export function CpmSweepControls({
  metadata,
  isRunning,
  onRun,
  onReset,
}: CpmSweepControlsProps) {
  const { t } = useTranslation();

  const maxSweepPoints =
    metadata?.limits.max_sweep_points ?? DEFAULT_MAX_SWEEP_POINTS;

  const schema = useMemo(
    () => createCpmSweepControlsSchema({ maxSweepPoints }),
    [maxSweepPoints],
  );

  const defaults = getDefaultSweepControls(metadata);

  const {
    register,
    handleSubmit,
    reset,
    trigger,
    formState: { errors, isValid },
  } = useForm<CpmSweepControlsInput>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: defaults,
  });

  useEffect(() => {
    reset(getDefaultSweepControls(metadata));
  }, [metadata, reset]);

  const validationMessage = (key: string | undefined) => {
    if (!key) return null;
    return t(`prediction.sweep.validation.${key}`, {
      defaultValue: t("prediction.validation.generic"),
      maxPoints: maxSweepPoints,
    });
  };

  const rangeErrorMessage =
    validationMessage(errors.max?.message) ??
    validationMessage(errors.min?.message);

  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit(onRun)}
      noValidate
      aria-label={t("prediction.sweep.controls.ariaLabel")}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <label htmlFor="sweep_min" className="text-sm font-medium text-slate-900">
            {t("prediction.sweep.controls.minLabel")}
          </label>
          <input
            id="sweep_min"
            type="number"
            min={0}
            step="any"
            className={fieldClass(!!errors.min)}
            {...register("min", {
              valueAsNumber: true,
              onChange: () => void trigger(["min", "max", "step"]),
            })}
          />
          {errors.min ? (
            <p className="text-xs text-rose-600" role="alert">
              {validationMessage(errors.min.message)}
            </p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <label htmlFor="sweep_max" className="text-sm font-medium text-slate-900">
            {t("prediction.sweep.controls.maxLabel")}
          </label>
          <input
            id="sweep_max"
            type="number"
            min={0}
            step="any"
            className={fieldClass(!!errors.max)}
            {...register("max", {
              valueAsNumber: true,
              onChange: () => void trigger(["min", "max", "step"]),
            })}
          />
          {errors.max ? (
            <p className="text-xs text-rose-600" role="alert">
              {validationMessage(errors.max.message)}
            </p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <label htmlFor="sweep_step" className="text-sm font-medium text-slate-900">
            {t("prediction.sweep.controls.stepLabel")}
          </label>
          <input
            id="sweep_step"
            type="number"
            min={0}
            step="any"
            className={fieldClass(!!errors.step)}
            {...register("step", {
              valueAsNumber: true,
              onChange: () => void trigger(["min", "max", "step"]),
            })}
          />
          <p className="text-xs text-slate-500">
            {t("prediction.sweep.controls.stepHelper", { maxPoints: maxSweepPoints })}
          </p>
          {errors.step ? (
            <p className="text-xs text-rose-600" role="alert">
              {validationMessage(errors.step.message)}
            </p>
          ) : null}
        </div>
      </div>

      {rangeErrorMessage && !isValid ? (
        <p className="text-sm text-rose-600" role="alert">
          {rangeErrorMessage}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          className={buttonPrimary}
          disabled={isRunning || !isValid}
        >
          {isRunning
            ? t("prediction.sweep.controls.running")
            : t("prediction.sweep.controls.run")}
        </button>
        <button
          type="button"
          className={buttonSecondary}
          onClick={() => {
            reset(getDefaultSweepControls(metadata));
            onReset();
          }}
          disabled={isRunning}
        >
          {t("prediction.sweep.controls.reset")}
        </button>
      </div>
    </form>
  );
}
