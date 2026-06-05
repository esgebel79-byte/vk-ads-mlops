import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { HealthResponse, MetadataResponse } from "../types";
import { cn } from "@/shared/lib/cn";

type ModelReadinessBannerProps = {
  health?: HealthResponse;
  metadata?: MetadataResponse;
  /** When false, hide the green ready banner (dashboard uses a compact status strip instead). */
  showWhenReady?: boolean;
  /** When false, publisher targeting warnings appear only in the campaign form. */
  showPublisherWarning?: boolean;
};

export function ModelReadinessBanner({
  health,
  metadata,
  showWhenReady = true,
  showPublisherWarning = true,
}: ModelReadinessBannerProps) {
  const { t } = useTranslation();

  const modelReady = health?.model_ready ?? metadata?.model_ready;
  const publisherCount = metadata?.publisher_universe.length ?? null;
  const publisherEmpty = publisherCount !== null && publisherCount === 0;

  if (modelReady === undefined) {
    return null;
  }

  if (modelReady) {
    if (!showWhenReady) {
      return null;
    }
    return (
      <div
        className={cn(
          "flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-4",
        )}
        role="status"
      >
        <CheckCircle2
          className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
          aria-hidden
        />
        <div>
          <p className="text-sm font-semibold text-emerald-900">
            {t("modelReadiness.readyTitle")}
          </p>
          <p className="mt-1 text-sm text-emerald-800">
            {t("modelReadiness.readyDescription")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-4"
        role="alert"
      >
        <AlertTriangle
          className="mt-0.5 h-5 w-5 shrink-0 text-amber-600"
          aria-hidden
        />
        <div>
          <p className="text-sm font-semibold text-amber-950">
            {t("modelReadiness.notReadyTitle")}
          </p>
          <p className="mt-1 text-sm text-amber-900">
            {t("modelReadiness.notReadyDescription")}
          </p>
          {health?.model_loaded && !health.model_ready ? (
            <p className="mt-2 text-sm text-amber-800">
              {t("modelReadiness.loadedButNotReady")}
            </p>
          ) : null}
        </div>
      </div>

      {showPublisherWarning && publisherEmpty ? (
        <div className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
          <AlertTriangle
            className="mt-0.5 h-5 w-5 shrink-0 text-slate-500"
            aria-hidden
          />
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {t("modelReadiness.publisherEmptyTitle")}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {t("modelReadiness.publisherEmptyDescription")}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
