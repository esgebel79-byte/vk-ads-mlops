export type CampaignRequest = {
  cpm: number;
  hour_start: number;
  hour_end: number;
  publishers: number[];
  audience_size: number;
  user_ids: number[];
};

export type PredictionResponse = {
  at_least_one: number;
  at_least_two: number;
  at_least_three: number;
  model_version: string;
  drift_flag: boolean;
  prediction_id: string;
};

export type CampaignFormValues = {
  cpm: number;
  forecast_duration_hours: number;
  publishers: number[];
  audience_size: number;
  user_ids_raw: string;
};

export const DEFAULT_FORECAST_PRESETS = [6, 12, 24, 48, 72, 168] as const;
