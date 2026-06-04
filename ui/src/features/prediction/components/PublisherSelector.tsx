import type { UseFormSetValue, UseFormWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { CampaignFormInput } from "../schema";
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
    setValue("publishers", next, { shouldValidate: true });
  };

  if (universe.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-surface-border bg-surface-muted/50 px-4 py-3">
        <p className="text-sm font-medium text-slate-800">
          {t("prediction.form.publishersUnavailableTitle")}
        </p>
        <p className="mt-1 text-xs text-slate-600">
          {t("prediction.form.publishersUnavailableDescription")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-slate-900">
        {t("prediction.form.publishersLabel")}
      </span>
      <p className="text-xs text-slate-500">
        {t("prediction.form.publishersHelper")}
      </p>
      <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-surface-border bg-white p-3">
        {universe.map((id) => {
          const checked = selected.includes(id);
          return (
            <label
              key={id}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition hover:bg-surface-muted",
                checked && "bg-brand-50/60",
              )}
            >
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-surface-border text-brand-600 focus:ring-brand-500"
                checked={checked}
                onChange={() => toggle(id)}
              />
              <span className="text-slate-800">
                {t("prediction.form.publisherItem", { id })}
              </span>
            </label>
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
