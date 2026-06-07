import { zodResolver } from "@hookform/resolvers/zod";
import { Info } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { MetadataResponse } from "@/features/system/types";
import {
  createCampaignFormSchema,
  defaultCampaignFormValues,
  formValuesToCampaignRequest,
  resolveCpmInputStep,
  type CampaignFormInput,
} from "../schema";
import { DEFAULT_FORECAST_PRESETS } from "../types";
import { CpmInput } from "./CpmInput";
import { ForecastPeriodSelector } from "./ForecastPeriodSelector";
import { PublisherSelector } from "./PublisherSelector";
import { cn } from "@/shared/lib/cn";

type CampaignFormProps = {
  metadata?: MetadataResponse;
  isSubmitting: boolean;
  modelNotReady?: boolean;
  onSubmit: (request: ReturnType<typeof formValuesToCampaignRequest>) => void;
  onResetResults: () => void;
  onCpmChange?: (cpm: number) => void;
  onFormValuesChange?: (
    values: CampaignFormInput,
    isValid: boolean,
  ) => void;
};

const buttonPrimary =
  "inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:cursor-not-allowed disabled:opacity-50";
const buttonSecondary =
  "inline-flex items-center justify-center rounded-lg border border-surface-border bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-slate-300/50 disabled:cursor-not-allowed disabled:opacity-60";

export function CampaignForm({
  metadata,
  isSubmitting,
  modelNotReady = false,
  onSubmit,
  onResetResults,
  onCpmChange,
  onFormValuesChange,
}: CampaignFormProps) {
  const { t } = useTranslation();

  const publisherUniverse = metadata?.publisher_universe ?? [];
  const forecastPresets =
    metadata?.time.recommended_presets?.length &&
    metadata.time.recommended_presets.length > 0
      ? metadata.time.recommended_presets
      : [...DEFAULT_FORECAST_PRESETS];

  const schema = useMemo(
    () =>
      createCampaignFormSchema({
        forecastPresets,
        publisherUniverse,
        requirePublishers: publisherUniverse.length > 0,
      }),
    [forecastPresets, publisherUniverse],
  );

  const defaultDuration = forecastPresets.includes(24)
    ? 24
    : (forecastPresets[0] ?? 24);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    trigger,
    formState: { errors, isValid },
  } = useForm<CampaignFormInput>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      ...defaultCampaignFormValues,
      forecast_duration_hours: defaultDuration,
      cpm: metadata?.cpm.min ?? defaultCampaignFormValues.cpm,
    },
  });

  const cpmValue = watch("cpm");
  const watchedValues = watch();

  useEffect(() => {
    if (publisherUniverse.length > 0) {
      void trigger("publishers");
    }
  }, [publisherUniverse.length, trigger]);

  useEffect(() => {
    void trigger("forecast_duration_hours");
  }, [forecastPresets, trigger]);

  useEffect(() => {
    if (typeof cpmValue === "number" && !Number.isNaN(cpmValue)) {
      onCpmChange?.(cpmValue);
    }
  }, [cpmValue, onCpmChange]);

  useEffect(() => {
    onFormValuesChange?.(watchedValues as CampaignFormInput, isValid);
  }, [watchedValues, isValid, onFormValuesChange]);

  const submit = handleSubmit((values) => {
    onSubmit(formValuesToCampaignRequest(values));
  });

  const clearForm = () => {
    reset({
      ...defaultCampaignFormValues,
      forecast_duration_hours: defaultDuration,
      cpm: metadata?.cpm.min ?? defaultCampaignFormValues.cpm,
    });
    onResetResults();
  };

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <CpmInput
        register={register}
        errorMessage={errors.cpm?.message}
        min={metadata?.cpm.min}
        max={metadata?.cpm.max}
        step={resolveCpmInputStep(metadata?.cpm.step)}
        cpmMeta={metadata?.cpm}
      />

      <div className="space-y-1.5">
        <label
          htmlFor="audience_size"
          className="text-sm font-medium text-slate-900"
        >
          {t("prediction.form.audienceLabel")}
        </label>
        <input
          id="audience_size"
          type="number"
          min={1}
          step={1}
          className={cn(
            "w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm",
            "focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20",
            errors.audience_size
              ? "border-rose-300"
              : "border-surface-border",
          )}
          {...register("audience_size", { valueAsNumber: true })}
        />
        <p className="text-xs text-slate-500">
          {t("prediction.form.audienceHelper")}
        </p>
        {errors.audience_size ? (
          <p className="text-xs text-rose-600" role="alert">
            {t(`prediction.validation.${errors.audience_size.message}`, {
              defaultValue: t("prediction.validation.generic"),
            })}
          </p>
        ) : null}
      </div>

      <p className="flex items-start gap-1.5 text-xs text-slate-500">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
        <span>{t("prediction.form.audienceSamplingNote")}</span>
      </p>

      <ForecastPeriodSelector
        watch={watch}
        setValue={setValue}
        errorMessage={errors.forecast_duration_hours?.message}
        presets={forecastPresets}
      />

      <PublisherSelector
        universe={publisherUniverse}
        watch={watch}
        setValue={setValue}
        errorMessage={errors.publishers?.message}
      />

      {modelNotReady ? (
        <p
          className="rounded-lg border border-amber-200/80 bg-amber-50/60 px-3 py-2 text-xs text-amber-950"
          role="status"
        >
          {t("prediction.form.modelNotReadyHelper")}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3 border-t border-surface-border pt-4">
        <button
          type="submit"
          className={buttonPrimary}
          disabled={isSubmitting || !isValid || modelNotReady}
          title={
            modelNotReady ? t("prediction.form.modelNotReadyHelper") : undefined
          }
        >
          {isSubmitting
            ? t("prediction.form.submitting")
            : t("prediction.form.submit")}
        </button>
        <button
          type="button"
          className={buttonSecondary}
          onClick={clearForm}
          disabled={isSubmitting}
        >
          {t("prediction.form.reset")}
        </button>
      </div>
    </form>
  );
}
