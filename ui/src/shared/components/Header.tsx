import { Activity } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useHealth } from "@/features/system/hooks";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { StatusBadge } from "./StatusBadge";
type HeaderProps = {
  onMenuToggle?: () => void;
  menuOpen?: boolean;
};

export function Header({ onMenuToggle, menuOpen }: HeaderProps) {
  const { t } = useTranslation();
  const health = useHealth();

  let apiVariant: "success" | "warning" | "danger" = "warning";
  let apiLabel = t("api.checking");

  if (health.isError) {
    apiVariant = "danger";
    apiLabel = t("api.disconnected");
  } else if (health.isSuccess) {
    apiVariant = "success";
    apiLabel = t("api.connected");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-surface-border bg-white/95 backdrop-blur">
      <div className="flex h-14 items-center justify-between gap-4 px-4 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {onMenuToggle ? (
            <button
              type="button"
              onClick={onMenuToggle}
              className="inline-flex rounded-lg border border-surface-border px-2.5 py-1.5 text-sm font-medium text-slate-700 lg:hidden"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
            >
              {menuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
            </button>
          ) : null}
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Activity className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {t("app.productName")}
              </p>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <StatusBadge label={apiLabel} variant={apiVariant} />
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
