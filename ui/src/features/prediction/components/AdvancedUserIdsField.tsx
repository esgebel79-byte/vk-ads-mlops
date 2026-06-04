import type { UseFormRegister } from "react-hook-form";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { CampaignFormInput } from "../schema";
import { cn } from "@/shared/lib/cn";

type AdvancedUserIdsFieldProps = {
  register: UseFormRegister<CampaignFormInput>;
  errorMessage?: string;
};

export function AdvancedUserIdsField({
  register,
  errorMessage,
}: AdvancedUserIdsFieldProps) {
  const { t } = useTranslation();

  return (
    <details className="group rounded-lg border border-surface-border bg-surface-muted/30">
      <summary
        className={cn(
          "flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-slate-900",
          "[&::-webkit-details-marker]:hidden",
        )}
      >
        <span>{t("prediction.form.advancedTitle")}</span>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-slate-500 transition group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="space-y-1.5 border-t border-surface-border px-4 py-3">
        <label htmlFor="user_ids_raw" className="text-sm font-medium text-slate-900">
          {t("prediction.form.userIdsLabel")}
        </label>
        <input
          id="user_ids_raw"
          type="text"
          autoComplete="off"
          placeholder={t("prediction.form.userIdsPlaceholder")}
          className={cn(
            "w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm",
            "focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20",
            errorMessage ? "border-rose-300" : "border-surface-border",
          )}
          {...register("user_ids_raw")}
        />
        <p className="text-xs text-slate-500">{t("prediction.form.userIdsHelper")}</p>
        {errorMessage ? (
          <p className="text-xs text-rose-600" role="alert">
            {t(`prediction.validation.${errorMessage}`, {
              defaultValue: t("prediction.validation.generic"),
            })}
          </p>
        ) : null}
      </div>
    </details>
  );
}
