import type { CampaignRequest, PredictionResponse } from "@/features/prediction/types";

export type RecentPredictionRaw = {
  prediction_id?: string;
  created_at?: string;
  timestamp?: string;
  request?: CampaignRequest;
  response?: PredictionResponse;
  latency_seconds?: number;
  model_version?: string;
  drift_flag?: boolean;
  drift_report?: unknown;
};

export type RecentPredictionsApiResponse = {
  items?: RecentPredictionRaw[];
  predictions?: RecentPredictionRaw[];
};

export type NormalizedPredictionRecord = {
  id: string;
  predictionId: string | null;
  createdAt: string | null;
  request: CampaignRequest | null;
  response: PredictionResponse | null;
  latencySeconds: number | null;
  modelVersion: string | null;
  driftFlag: boolean | null;
};

export type HistoryDriftFilter = "all" | "drift" | "no_drift";

export type HistorySortKey =
  | "newest"
  | "oldest"
  | "cpm_high"
  | "cpm_low"
  | "reach_high"
  | "latency_low";

export type HistoryFilters = {
  search: string;
  drift: HistoryDriftFilter;
  modelVersion: string;
  cpmMin: number | null;
  cpmMax: number | null;
  sort: HistorySortKey;
};

export type HistorySummary = {
  total: number;
  averageLatencySeconds: number | null;
  driftWarningCount: number;
  mostCommonModelVersion: string | null;
  latestPredictionAt: string | null;
};
