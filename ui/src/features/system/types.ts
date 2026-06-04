export type ArtifactStatus = {
  path: string;
  exists: boolean;
};

export type HealthResponse = {
  status: string;
  model_loaded: boolean;
  model_ready: boolean;
  artifacts?: Record<string, ArtifactStatus>;
};

export type CpmSource = "artifact" | "config" | "unavailable";

export type CpmMetadata = {
  min: number;
  max: number;
  step: number;
  median_competitor_cpm: number | null;
  max_competitor_cpm: number | null;
  source: CpmSource;
};

export type TimeMetadata = {
  mode: "absolute_hours";
  min_hour: number;
  max_hour: number;
  recommended_presets: number[];
  session_silence_window_hours: number;
};

export type LimitsMetadata = {
  max_sweep_points: number;
  max_recent_predictions: number;
};

export type MetadataResponse = {
  model_ready: boolean;
  model_loaded: boolean;
  model_version: string;
  publisher_universe: number[];
  cpm: CpmMetadata;
  time: TimeMetadata;
  limits: LimitsMetadata;
};
