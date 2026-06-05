import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/shared/lib/cn";

type TechnicalDetailsSectionProps = {
  children: ReactNode;
  className?: string;
};

export function TechnicalDetailsSection({
  children,
  className,
}: TechnicalDetailsSectionProps) {
  const { t } = useTranslation();

  return (
    <details
      className={cn(
        "group rounded-xl border border-surface-border bg-surface-card shadow-card",
        className,
      )}
    >
      <summary className="cursor-pointer list-none px-5 py-4 marker:content-none [&::-webkit-details-marker]:hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {t("system.technicalDetails.title")}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {t("system.technicalDetails.description")}
            </p>
          </div>
          <span
            className="text-xs font-medium uppercase tracking-wide text-brand-600 group-open:hidden"
            aria-hidden
          >
            {t("system.technicalDetails.expand")}
          </span>
          <span
            className="hidden text-xs font-medium uppercase tracking-wide text-brand-600 group-open:inline"
            aria-hidden
          >
            {t("system.technicalDetails.collapse")}
          </span>
        </div>
      </summary>
      <div className="space-y-6 border-t border-surface-border px-5 py-5">
        {children}
      </div>
    </details>
  );
}
