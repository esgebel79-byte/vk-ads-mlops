import { useTranslation } from "react-i18next";
import { CampaignPredictionPanel } from "@/features/prediction/components/CampaignPredictionPanel";
import { DashboardStatusStrip } from "@/features/system/components/DashboardStatusStrip";
import { ModelReadinessBanner } from "@/features/system/components/ModelReadinessBanner";
import { useHealth, useMetadata } from "@/features/system/hooks";

export function DashboardPage() {
  const { t } = useTranslation();
  const health = useHealth();
  const metadata = useMetadata();

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-surface-border bg-gradient-to-br from-brand-950 via-brand-900 to-slate-900 px-6 py-6 text-white shadow-card lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-200">
          {t("app.productName")}
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          {t("dashboard.heroTitle")}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-brand-100/90">
          {t("dashboard.heroDescription")}
        </p>
      </section>

      <ModelReadinessBanner
        health={health.data}
        metadata={metadata.data}
        showWhenReady={false}
        showPublisherWarning={false}
      />

      <CampaignPredictionPanel />

      <DashboardStatusStrip />
    </div>
  );
}
