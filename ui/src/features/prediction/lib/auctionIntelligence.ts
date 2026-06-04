import type { CpmMetadata } from "@/features/system/types";
import type { CpmSweepPoint } from "../types";

export type AuctionInsightKind =
  | "guaranteed_win"
  | "edge_case"
  | "low_competitiveness"
  | "thresholds_unavailable"
  | "drift"
  | "session_burnout"
  | null;

export type AuctionInsightStatus = "success" | "warning" | "info" | "neutral";

export type AuctionInsight = {
  kind: AuctionInsightKind;
  status: AuctionInsightStatus;
};

export function areCpmThresholdsAvailable(cpmMeta: CpmMetadata | undefined): boolean {
  if (!cpmMeta) {
    return false;
  }
  if (cpmMeta.source === "unavailable") {
    return false;
  }
  return (
    cpmMeta.median_competitor_cpm != null && cpmMeta.max_competitor_cpm != null
  );
}

export function cpmApproxEqualsMax(cpm: number, maxCompetitorCpm: number): boolean {
  const tolerance = Math.max(0.1, maxCompetitorCpm * 0.01);
  return Math.abs(cpm - maxCompetitorCpm) <= tolerance;
}

export function resolvePrimaryAuctionInsight(
  cpm: number,
  cpmMeta: CpmMetadata | undefined,
): AuctionInsight {
  if (!areCpmThresholdsAvailable(cpmMeta)) {
    return { kind: "thresholds_unavailable", status: "info" };
  }

  const median = cpmMeta!.median_competitor_cpm!;
  const max = cpmMeta!.max_competitor_cpm!;

  if (cpm > max) {
    return { kind: "guaranteed_win", status: "success" };
  }

  if (cpmApproxEqualsMax(cpm, max)) {
    return { kind: "edge_case", status: "warning" };
  }

  if (cpm < median) {
    return { kind: "low_competitiveness", status: "warning" };
  }

  return { kind: null, status: "neutral" };
}

export function resolveSweepDriftInsight(
  sweepPoints: CpmSweepPoint[] | undefined,
): AuctionInsight | null {
  if (!sweepPoints?.some((p) => p.drift_flag)) {
    return null;
  }
  return { kind: "drift", status: "warning" };
}

export function resolveSessionBurnoutInsight(
  sessionSilenceHours: number | undefined,
): AuctionInsight | null {
  if (sessionSilenceHours == null || sessionSilenceHours <= 0) {
    return null;
  }
  return { kind: "session_burnout", status: "info" };
}

export function buildAuctionInsights(params: {
  cpm: number;
  cpmMeta: CpmMetadata | undefined;
  sweepPoints?: CpmSweepPoint[];
  sessionSilenceHours?: number;
}): AuctionInsight[] {
  const insights: AuctionInsight[] = [];

  const primary = resolvePrimaryAuctionInsight(params.cpm, params.cpmMeta);
  if (primary.kind) {
    insights.push(primary);
  }

  const drift = resolveSweepDriftInsight(params.sweepPoints);
  if (drift) {
    insights.push(drift);
  }

  const session = resolveSessionBurnoutInsight(params.sessionSilenceHours);
  if (session) {
    insights.push(session);
  }

  return insights;
}
