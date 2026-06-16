import { AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/shared/lib/cn";

type ErrorStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
};

export function ErrorState({
  title,
  description,
  onRetry,
  className,
}: ErrorStateProps) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-lg border border-rose-200 bg-rose-50/60 px-6 py-10 text-center",
        className,
      )}
      role="alert"
    >
      <AlertCircle className="h-8 w-8 text-rose-600" aria-hidden />
      <div className="space-y-1">
        <p className="text-sm font-semibold text-rose-900">
          {title ?? t("states.errorTitle")}
        </p>
        <p className="max-w-md text-sm text-rose-800">
          {description ?? t("states.errorDescription")}
        </p>
      </div>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-rose-900 shadow-sm ring-1 ring-rose-200 transition hover:bg-rose-50"
        >
          {t("states.retry")}
        </button>
      ) : null}
    </div>
  );
}
