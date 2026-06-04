import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { MetadataResponse } from "@/features/system/types";
import {
  createCampaignFormSchema,
  defaultCampaignFormValues,
  formValuesToCampaignRequest,
  type CampaignFormInput,
} from "../schema";
import { DEFAULT_FORECAST_PRESETS } from "../types";
import { AdvancedUserIdsField } from "./AdvancedUserIdsField";
import { CpmInput } from "./CpmInput";
import { ForecastPeriodSelector } from "./ForecastPeriodSelector";
import { PublisherSelector } from "./PublisherSelector";
import { cn } from "@/shared/lib/cn";

type CampaignFormProps = {
  metadata?: MetadataResponse;
  isSubmitting: boolean;
  onSubmit: (request: ReturnType<typeof formValuesToCampaignRequest>) => void;
  onResetResults: () => void;
  onCpmChange?: (cpm: number) => void;
};

const buttonPrimary =
  "inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:cursor-not-allowed disabled:opacity-60";
const buttonSecondary =
  "inline-flex items-center justify-center rounded-lg border border-surface-border bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-slate-300/50 disabled:cursor-not-allowed disabled:opacity-60";

export function CampaignForm({
  metadata,
  isSubmitting,
  onSubmit,
  onResetResults,
  onCpmChange,
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
    : forecastPresets[0] ?? 24;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
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

  useEffect(() => {
    if (typeof cpmValue === "number" && !Number.isNaN(cpmValue)) {
      onCpmChange?.(cpmValue);
    }
  }, [cpmValue, onCpmChange]);

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
    <form onSubmit={submit} className="space-y-6" noValidate>
      <div className="grid gap-6 lg:grid-cols-2">
        <CpmInput
          register={register}
          errorMessage={errors.cpm?.message}
          min={metadata?.cpm.min}
          max={metadata?.cpm.max}
          step={metadata?.cpm.step}
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
      </div>

      <ForecastPeriodSelector
        register={register}
        watch={watch}
        errorMessage={errors.forecast_duration_hours?.message}
        presets={forecastPresets}
      />

      <PublisherSelector
        universe={publisherUniverse}
        watch={watch}
        setValue={setValue}
        errorMessage={errors.publishers?.message}
      />

      <AdvancedUserIdsField
        register={register}
        errorMessage={errors.user_ids_raw?.message}
      />

      <div className="flex flex-wrap gap-3 border-t border-surface-border pt-4">
        <button
          type="submit"
          className={buttonPrimary}
          disabled={isSubmitting || !isValid}
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
