import { LayoutDashboard, Server } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import { cn } from "@/shared/lib/cn";

const navItems = [
  { to: "/", labelKey: "nav.dashboard", icon: LayoutDashboard, end: true },
  {
    to: "/system",
    labelKey: "nav.systemStatus",
    icon: Server,
    end: false,
  },
] as const;

type SidebarProps = {
  mobile?: boolean;
  onNavigate?: () => void;
};

export function Sidebar({ mobile = false, onNavigate }: SidebarProps) {
  const { t } = useTranslation();

  return (
    <nav
      className={cn(
        "flex flex-col gap-1 p-3",
        mobile ? "bg-white" : "lg:p-4",
      )}
      aria-label={t("nav.dashboard")}
    >
      {navItems.map(({ to, labelKey, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
              isActive
                ? "bg-brand-50 text-brand-800"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
            )
          }
        >
          <Icon className="h-4 w-4 shrink-0" aria-hidden />
          {t(labelKey)}
        </NavLink>
      ))}
    </nav>
  );
}
