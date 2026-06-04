import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

type CardProps = {
  title?: ReactNode;
  description?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
};

export function Card({
  title,
  description,
  children,
  className,
  action,
}: CardProps) {
  return (
    <section
      className={cn(
        "rounded-xl border border-surface-border bg-surface-card shadow-card",
        className,
      )}
    >
      {(title || description || action) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-surface-border px-5 py-4">
          <div className="min-w-0 space-y-1">
            {title ? (
              <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            ) : null}
            {description ? (
              <p className="text-sm text-slate-600">{description}</p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </header>
      )}
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}
