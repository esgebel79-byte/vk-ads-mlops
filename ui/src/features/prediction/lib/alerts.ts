import type { CpmMetadata } from "@/features/system/types";

const CPM_EQUALITY_EPSILON = 0.05;

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
  const median = cpmMeta?.median_competitor_cpm ?? null;
  const max = cpmMeta?.max_competitor_cpm ?? null;

  if (median == null || max == null) {
    return "thresholds_unavailable";
  }

  if (max != null && cpm > max) {
    return "guaranteed_win";
  }

  if (max != null && Math.abs(cpm - max) <= CPM_EQUALITY_EPSILON) {
    return "edge_case";
  }

  if (median != null && cpm < median) {
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
