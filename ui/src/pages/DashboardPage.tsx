import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { HealthStatusCard } from "@/features/system/components/HealthStatusCard";
import { MetadataCard } from "@/features/system/components/MetadataCard";
import { ModelReadinessBanner } from "@/features/system/components/ModelReadinessBanner";
import { useHealth, useMetadata } from "@/features/system/hooks";
import { Card } from "@/shared/components/Card";
import { StatusBadge } from "@/shared/components/StatusBadge";

export function DashboardPage() {
  const { t } = useTranslation();
  const health = useHealth();
  const metadata = useMetadata();

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-surface-border bg-gradient-to-br from-brand-950 via-brand-900 to-slate-900 px-6 py-8 text-white shadow-card lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-200">
          {t("app.productName")}
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          {t("dashboard.heroTitle")}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-brand-100/90 sm:text-base">
          {t("dashboard.heroDescription")}
        </p>
        <p className="mt-4 text-sm text-brand-200/80">{t("app.tagline")}</p>
      </section>

      <ModelReadinessBanner
        health={health.data}
        metadata={metadata.data}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <HealthStatusCard />
        <MetadataCard />
      </div>

      <Card
        title={t("dashboard.nextModuleTitle")}
        description={t("dashboard.nextModuleDescription")}
        action={
          <StatusBadge
            label={t("dashboard.nextModuleBadge")}
            variant="info"
          />
        }
      >
        <div className="flex items-center gap-3 rounded-lg border border-dashed border-surface-border bg-surface-muted/40 px-4 py-6 text-slate-600">
          <Sparkles className="h-5 w-5 shrink-0 text-brand-500" aria-hidden />
          <p className="text-sm">{t("dashboard.nextModuleDescription")}</p>
        </div>
      </Card>
    </div>
  );
}
