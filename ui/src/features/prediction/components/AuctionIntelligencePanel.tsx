import {
  AlertTriangle,
  CheckCircle2,
  Info,
  TrendingDown,
} from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { MetadataResponse } from "@/features/system/types";
import type { CpmSweepPoint } from "../types";
import {
  buildAuctionInsights,
  type AuctionInsight,
  type AuctionInsightStatus,
} from "../lib/auctionIntelligence";
import { Card } from "@/shared/components/Card";
import { cn } from "@/shared/lib/cn";

type AuctionIntelligencePanelProps = {
  cpm: number;
  metadata?: MetadataResponse;
  sweepPoints?: CpmSweepPoint[];
};

type StatusStyle = {
  border: string;
  bg: string;
  icon: typeof Info;
};

const statusStyles: Record<AuctionInsightStatus, StatusStyle> = {
  success: {
    border: "border-emerald-200",
    bg: "bg-emerald-50/90",
    icon: CheckCircle2,
  },
  warning: {
    border: "border-amber-200",
    bg: "bg-amber-50/90",
    icon: AlertTriangle,
  },
  info: {
    border: "border-slate-200",
    bg: "bg-slate-50",
    icon: Info,
  },
  neutral: {
    border: "border-slate-200",
    bg: "bg-slate-50",
    icon: Info,
  },
};

function insightCopy(
  insight: AuctionInsight,
  t: (key: string, opts?: Record<string, unknown>) => string,
): { title: string; description: string } | null {
  const kind = insight.kind;
  if (!kind) {
    return null;
  }

  const keys: Record<
    NonNullable<typeof kind>,
    { title: string; description: string }
  > = {
    guaranteed_win: {
      title: t("prediction.auction.guaranteedWinTitle"),
      description: t("prediction.auction.guaranteedWinDescription"),
    },
    edge_case: {
      title: t("prediction.auction.edgeCaseTitle"),
      description: t("prediction.auction.edgeCaseDescription"),
    },
    low_competitiveness: {
      title: t("prediction.auction.lowCompetitivenessTitle"),
      description: t("prediction.auction.lowCompetitivenessDescription"),
    },
    thresholds_unavailable: {
      title: t("prediction.auction.thresholdsLimitedTitle"),
      description: t("prediction.auction.thresholdsLimitedDescription"),
    },
    drift: {
      title: t("prediction.auction.driftTitle"),
      description: t("prediction.auction.driftDescription"),
    },
    session_burnout: {
      title: t("prediction.auction.sessionBurnoutTitle"),
      description: t("prediction.auction.sessionBurnoutDescription"),
    },
  };

  return keys[kind];
}

export function AuctionIntelligencePanel({
  cpm,
  metadata,
  sweepPoints,
}: AuctionIntelligencePanelProps) {
  const { t } = useTranslation();

  const insights = useMemo(
    () =>
      buildAuctionInsights({
        cpm,
        cpmMeta: metadata?.cpm,
        sweepPoints,
        sessionSilenceHours: metadata?.time.session_silence_window_hours,
      }),
    [cpm, metadata, sweepPoints],
  );

  const sessionHours = metadata?.time.session_silence_window_hours;

  return (
    <Card
      title={t("prediction.auction.panelTitle")}
      description={t("prediction.auction.panelDescription")}
    >
      <div className="space-y-3" role="list">
        {insights.length === 0 ? (
          <div className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <TrendingDown
              className="mt-0.5 h-5 w-5 shrink-0 text-slate-500"
              aria-hidden
            />
            <p className="text-sm text-slate-600">
              {t("prediction.auction.noInsights")}
            </p>
          </div>
        ) : (
          insights.map((insight) => {
            const copy = insightCopy(insight, t);
            if (!copy || !insight.kind) {
              return null;
            }
            const style = statusStyles[insight.status];
            const Icon = style.icon;
            const description =
              insight.kind === "session_burnout" && sessionHours != null
                ? t("prediction.auction.sessionBurnoutDescription", {
                    hours: sessionHours,
                  })
                : copy.description;

            return (
              <div
                key={insight.kind}
                role="listitem"
                className={cn(
                  "flex gap-3 rounded-xl border px-4 py-3",
                  style.border,
                  style.bg,
                )}
              >
                <Icon
                  className={cn(
                    "mt-0.5 h-5 w-5 shrink-0",
                    insight.status === "success"
                      ? "text-emerald-600"
                      : insight.status === "warning"
                        ? "text-amber-600"
                        : "text-slate-500",
                  )}
                  aria-hidden
                />
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {copy.title}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">{description}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
