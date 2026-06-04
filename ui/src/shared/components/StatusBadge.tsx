import { cn } from "@/shared/lib/cn";

export type StatusVariant = "success" | "warning" | "danger" | "neutral" | "info";

const variantStyles: Record<StatusVariant, string> = {
  success: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  warning: "bg-amber-50 text-amber-900 ring-amber-200",
  danger: "bg-rose-50 text-rose-800 ring-rose-200",
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  info: "bg-brand-50 text-brand-800 ring-brand-200",
};

type StatusBadgeProps = {
  label: string;
  variant?: StatusVariant;
  className?: string;
};

export function StatusBadge({
  label,
  variant = "neutral",
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        variantStyles[variant],
        className,
      )}
    >
      {label}
    </span>
  );
}
