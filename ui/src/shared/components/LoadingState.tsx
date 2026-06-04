import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/shared/lib/cn";

type LoadingStateProps = {
  className?: string;
  label?: string;
};

export function LoadingState({ className, label }: LoadingStateProps) {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2 py-10 text-sm text-slate-600",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-4 w-4 animate-spin text-brand-600" aria-hidden />
      <span>{label ?? t("states.loading")}</span>
    </div>
  );
}
