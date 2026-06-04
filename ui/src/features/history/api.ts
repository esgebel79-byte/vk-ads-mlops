import { httpGet } from "@/shared/api/http";
import type { RecentPredictionsApiResponse } from "./types";
import { normalizeRecentPredictions } from "./utils";
import type { NormalizedPredictionRecord } from "./types";

const DEFAULT_RECENT_LIMIT = 100;

export async function getRecentPredictions(
  limit = DEFAULT_RECENT_LIMIT,
): Promise<NormalizedPredictionRecord[]> {
  const path = `/predictions/recent?limit=${encodeURIComponent(String(limit))}`;
  const raw = await httpGet<RecentPredictionsApiResponse>(path);
  return normalizeRecentPredictions(raw);
}
