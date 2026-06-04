import { useTranslation } from "react-i18next";
import { persistLanguage } from "@/i18n";
import { cn } from "@/shared/lib/cn";

const languages = [
  { code: "en", labelKey: "language.en" },
  { code: "ru", labelKey: "language.ru" },
] as const;

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();

  return (
    <div className="flex items-center gap-2">
      <span className="sr-only">{t("language.label")}</span>
      <div
        className="inline-flex rounded-lg border border-surface-border bg-white p-0.5"
        role="group"
        aria-label={t("language.label")}
      >
        {languages.map(({ code, labelKey }) => {
          const active = i18n.language.startsWith(code);
          return (
            <button
              key={code}
              type="button"
              onClick={() => {
                void i18n.changeLanguage(code);
                persistLanguage(code);
              }}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition",
                active
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50",
              )}
              aria-pressed={active}
            >
              {t(labelKey)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
