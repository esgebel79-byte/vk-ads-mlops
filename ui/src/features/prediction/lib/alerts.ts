import type { CpmMetadata } from "@/features/system/types";
import {
  areCpmThresholdsAvailable,
  cpmApproxEqualsMax,
} from "./auctionIntelligence";

export type CpmAlertKind =
  | "guaranteed_win"
  | "edge_case"
  | "low_competitiveness"
  | "thresholds_unavailable"
  | null;

export function resolveCpmAlertKind(
  cpm: number,
  cpmMeta: CpmMetadata | undefined,
): CpmAlertKind {
  if (!areCpmThresholdsAvailable(cpmMeta)) {
    return "thresholds_unavailable";
  }

  const median = cpmMeta!.median_competitor_cpm!;
  const max = cpmMeta!.max_competitor_cpm!;

  if (cpm > max) {
    return "guaranteed_win";
  }

  if (cpmApproxEqualsMax(cpm, max)) {
    return "edge_case";
  }

  if (cpm < median) {
    return "low_competitiveness";
  }

  return null;
}

export function computePredictedReach(
  audienceSize: number,
  atLeastOne: number,
): number {
  return Math.round(audienceSize * atLeastOne);
}

export function isLowPredictedReach(
  audienceSize: number,
  atLeastOne: number,
): boolean {
  const reach = computePredictedReach(audienceSize, atLeastOne);
  const relativeThreshold = Math.max(10, Math.round(audienceSize * 0.02));
  return reach > 0 && reach < relativeThreshold;
}
