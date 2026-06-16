import { Inbox } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/shared/lib/cn";

type EmptyStateProps = {
  title?: string;
  description?: string;
  className?: string;
};

export function EmptyState({ title, description, className }: EmptyStateProps) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-lg border border-dashed border-surface-border bg-surface-muted/50 px-6 py-10 text-center",
        className,
      )}
    >
      <Inbox className="h-8 w-8 text-slate-400" aria-hidden />
      <div className="space-y-1">
        <p className="text-sm font-semibold text-slate-800">
          {title ?? t("states.emptyTitle")}
        </p>
        <p className="max-w-md text-sm text-slate-600">
          {description ?? t("states.emptyDescription")}
        </p>
      </div>
    </div>
  );
}
