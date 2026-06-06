import type { UseFormSetValue, UseFormWatch } from "react-hook-form";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { CampaignFormInput } from "../schema";
import { FieldHelp } from "@/shared/components/FieldHelp";
import { cn } from "@/shared/lib/cn";

type PublisherSelectorProps = {
  universe: number[];
  watch: UseFormWatch<CampaignFormInput>;
  setValue: UseFormSetValue<CampaignFormInput>;
  errorMessage?: string;
};

export function PublisherSelector({
  universe,
  watch,
  setValue,
  errorMessage,
}: PublisherSelectorProps) {
  const { t } = useTranslation();
  const selected = watch("publishers") ?? [];

  const toggle = (id: number) => {
    const next = selected.includes(id)
      ? selected.filter((p: number) => p !== id)
      : [...selected, id];
    setValue("publishers", next, { shouldValidate: true, shouldDirty: true });
  };

  if (universe.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-surface-border bg-surface-muted/40 px-4 py-3">
        <p className="text-sm font-medium text-slate-700">
          {t("prediction.form.publishersUnavailableTitle")}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {t("prediction.form.publishersUnavailableDescription")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-medium text-slate-900">
          {t("prediction.form.publishersLabel")}
        </span>
        <FieldHelp text={t("prediction.form.publishersTooltip")} />
      </div>
      <p className="text-xs text-slate-500">
        {t("prediction.form.publishersHelper")}
      </p>
      <div
        className="grid gap-2 sm:grid-cols-2"
        role="group"
        aria-label={t("prediction.form.publishersLabel")}
      >
        {universe.map((id, index) => {
          const checked = selected.includes(id);
          const segmentNumber = index + 1;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={checked}
              onClick={() => toggle(id)}
              className={cn(
                "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-brand-500/30",
                checked
                  ? "border-brand-500 bg-brand-50/80 text-brand-900 shadow-sm"
                  : "border-surface-border bg-white text-slate-700 hover:border-slate-300 hover:bg-surface-muted/40",
              )}
            >
              <span
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition",
                  checked
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-slate-300 bg-white",
                )}
                aria-hidden
              >
                {checked ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
              </span>
              <span className="font-medium">
                {t("prediction.form.publisherItem", { number: segmentNumber })}
              </span>
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
