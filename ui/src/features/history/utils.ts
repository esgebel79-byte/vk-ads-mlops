import type { CampaignRequest } from "@/features/prediction/types";
import type {
  HistoryFilters,
  HistorySummary,
  NormalizedPredictionRecord,
  RecentPredictionRaw,
} from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function parseString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return undefined;
}

function parseBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }
  return undefined;
}

function parseCampaignRequest(value: unknown): CampaignRequest | null {
  if (!isRecord(value)) {
    return null;
  }
  const cpm = parseNumber(value.cpm);
  const hourStart = parseNumber(value.hour_start);
  const hourEnd = parseNumber(value.hour_end);
  const audienceSize = parseNumber(value.audience_size);
  if (
    cpm == null ||
    hourStart == null ||
    hourEnd == null ||
    audienceSize == null
  ) {
    return null;
  }
  const publishers = Array.isArray(value.publishers)
    ? value.publishers
        .map((p) => parseNumber(p))
        .filter((p): p is number => p != null)
    : [];
  const userIds = Array.isArray(value.user_ids)
    ? value.user_ids
        .map((id) => parseNumber(id))
        .filter((id): id is number => id != null)
    : [];
  return {
    cpm,
    hour_start: hourStart,
    hour_end: hourEnd,
    publishers,
    audience_size: audienceSize,
    user_ids: userIds,
  };
}

function parsePredictionResponse(
  value: unknown,
): NormalizedPredictionRecord["response"] {
  if (!isRecord(value)) {
    return null;
  }
  const atLeastOne = parseNumber(value.at_least_one);
  const atLeastTwo = parseNumber(value.at_least_two);
  const atLeastThree = parseNumber(value.at_least_three);
  const modelVersion = parseString(value.model_version);
  const driftFlag = parseBoolean(value.drift_flag);
  const predictionId = parseString(value.prediction_id);
  if (
    atLeastOne == null ||
    atLeastTwo == null ||
    atLeastThree == null ||
    modelVersion == null ||
    driftFlag == null ||
    predictionId == null
  ) {
    return null;
  }
  return {
    at_least_one: atLeastOne,
    at_least_two: atLeastTwo,
    at_least_three: atLeastThree,
    model_version: modelVersion,
    drift_flag: driftFlag,
    prediction_id: predictionId,
  };
}

function normalizeRawRecord(
  raw: RecentPredictionRaw,
  index: number,
): NormalizedPredictionRecord | null {
  const predictionId =
    parseString(raw.prediction_id) ??
    parseString(raw.response?.prediction_id) ??
    null;
  const createdAt =
    parseString(raw.created_at) ?? parseString(raw.timestamp) ?? null;
  const request = raw.request
    ? parseCampaignRequest(raw.request)
    : null;
  const response = raw.response
    ? parsePredictionResponse(raw.response)
    : null;
  const latencySeconds = parseNumber(raw.latency_seconds) ?? null;
  const modelVersion =
    parseString(raw.model_version) ??
    response?.model_version ??
    null;
  const driftFlag =
    parseBoolean(raw.drift_flag) ?? response?.drift_flag ?? null;

  const id = predictionId ?? createdAt ?? `record-${index}`;

  if (
    !predictionId &&
    !createdAt &&
    !request &&
    !response &&
    latencySeconds == null
  ) {
    return null;
  }

  return {
    id,
    predictionId,
    createdAt,
    request,
    response,
    latencySeconds,
    modelVersion,
    driftFlag,
  };
}

export function normalizeRecentPredictions(
  raw: unknown,
): NormalizedPredictionRecord[] {
  if (!isRecord(raw)) {
    return [];
  }

  const list = Array.isArray(raw.items)
    ? raw.items
    : Array.isArray(raw.predictions)
      ? raw.predictions
      : Array.isArray(raw)
        ? raw
        : [];

  return list
    .map((item, index) =>
      normalizeRawRecord(item as RecentPredictionRaw, index),
    )
    .filter((record): record is NormalizedPredictionRecord => record != null);
}

export function formatPredictionTimestamp(
  record: NormalizedPredictionRecord,
): string | null {
  return record.createdAt;
}

export function getPredictionTimestampMs(
  record: NormalizedPredictionRecord,
): number | null {
  const iso = formatPredictionTimestamp(record);
  if (!iso) {
    return null;
  }
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

export function getPredictionCpm(
  record: NormalizedPredictionRecord,
): number | null {
  return record.request?.cpm ?? null;
}

export function getPredictionDuration(
  record: NormalizedPredictionRecord,
): number | null {
  const req = record.request;
  if (!req) {
    return null;
  }
  const duration = req.hour_end - req.hour_start;
  return Number.isFinite(duration) && duration >= 0 ? duration : null;
}

export function getPredictionReach(
  record: NormalizedPredictionRecord,
): number | null {
  const req = record.request;
  const prob = record.response?.at_least_one;
  if (!req || prob == null) {
    return null;
  }
  return Math.round(req.audience_size * prob);
}

export function hasDriftWarning(record: NormalizedPredictionRecord): boolean {
  return record.driftFlag === true;
}

export function computeHistorySummary(
  records: NormalizedPredictionRecord[],
): HistorySummary {
  const total = records.length;
  const latencies = records
    .map((r) => r.latencySeconds)
    .filter((v): v is number => v != null);
  const averageLatencySeconds =
    latencies.length > 0
      ? latencies.reduce((sum, v) => sum + v, 0) / latencies.length
      : null;

  const driftWarningCount = records.filter(hasDriftWarning).length;

  const versionCounts = new Map<string, number>();
  for (const record of records) {
    const version = record.modelVersion;
    if (!version) {
      continue;
    }
    versionCounts.set(version, (versionCounts.get(version) ?? 0) + 1);
  }
  let mostCommonModelVersion: string | null = null;
  let maxCount = 0;
  for (const [version, count] of versionCounts) {
    if (count > maxCount) {
      maxCount = count;
      mostCommonModelVersion = version;
    }
  }

  let latestMs: number | null = null;
  let latestPredictionAt: string | null = null;
  for (const record of records) {
    const ms = getPredictionTimestampMs(record);
    const iso = formatPredictionTimestamp(record);
    if (ms != null && iso && (latestMs == null || ms > latestMs)) {
      latestMs = ms;
      latestPredictionAt = iso;
    }
  }

  return {
    total,
    averageLatencySeconds,
    driftWarningCount,
    mostCommonModelVersion,
    latestPredictionAt,
  };
}

function matchesSearch(
  record: NormalizedPredictionRecord,
  search: string,
): boolean {
  const q = search.trim().toLowerCase();
  if (!q) {
    return true;
  }
  const id = record.predictionId?.toLowerCase() ?? "";
  return id.includes(q);
}

function matchesDrift(
  record: NormalizedPredictionRecord,
  drift: HistoryFilters["drift"],
): boolean {
  if (drift === "all") {
    return true;
  }
  if (drift === "drift") {
    return hasDriftWarning(record);
  }
  return record.driftFlag === false;
}

function matchesModelVersion(
  record: NormalizedPredictionRecord,
  modelVersion: string,
): boolean {
  if (!modelVersion) {
    return true;
  }
  return record.modelVersion === modelVersion;
}

function matchesCpmRange(
  record: NormalizedPredictionRecord,
  cpmMin: number | null,
  cpmMax: number | null,
): boolean {
  const cpm = getPredictionCpm(record);
  if (cpm == null) {
    return cpmMin == null && cpmMax == null;
  }
  if (cpmMin != null && cpm < cpmMin) {
    return false;
  }
  if (cpmMax != null && cpm > cpmMax) {
    return false;
  }
  return true;
}

function sortRecords(
  records: NormalizedPredictionRecord[],
  sort: HistoryFilters["sort"],
): NormalizedPredictionRecord[] {
  const copy = [...records];
  copy.sort((a, b) => {
    switch (sort) {
      case "oldest": {
        const ta = getPredictionTimestampMs(a) ?? 0;
        const tb = getPredictionTimestampMs(b) ?? 0;
        return ta - tb;
      }
      case "cpm_high": {
        return (getPredictionCpm(b) ?? -Infinity) - (getPredictionCpm(a) ?? -Infinity);
      }
      case "cpm_low": {
        return (getPredictionCpm(a) ?? Infinity) - (getPredictionCpm(b) ?? Infinity);
      }
      case "reach_high": {
        return (
          (getPredictionReach(b) ?? -Infinity) -
          (getPredictionReach(a) ?? -Infinity)
        );
      }
      case "latency_low": {
        return (
          (a.latencySeconds ?? Infinity) - (b.latencySeconds ?? Infinity)
        );
      }
      case "newest":
      default: {
        const ta = getPredictionTimestampMs(a) ?? 0;
        const tb = getPredictionTimestampMs(b) ?? 0;
        return tb - ta;
      }
    }
  });
  return copy;
}

export function applyHistoryFilters(
  records: NormalizedPredictionRecord[],
  filters: HistoryFilters,
): NormalizedPredictionRecord[] {
  const filtered = records.filter(
    (record) =>
      matchesSearch(record, filters.search) &&
      matchesDrift(record, filters.drift) &&
      matchesModelVersion(record, filters.modelVersion) &&
      matchesCpmRange(record, filters.cpmMin, filters.cpmMax),
  );
  return sortRecords(filtered, filters.sort);
}

export function collectModelVersions(
  records: NormalizedPredictionRecord[],
): string[] {
  const versions = new Set<string>();
  for (const record of records) {
    if (record.modelVersion) {
      versions.add(record.modelVersion);
    }
  }
  return [...versions].sort();
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function csvCell(value: string | number | boolean | null | undefined): string {
  if (value == null || value === "") {
    return "";
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  return csvEscape(String(value));
}

export function exportHistoryToCsv(
  records: NormalizedPredictionRecord[],
): string {
  const headers = [
    "prediction_id",
    "timestamp",
    "cpm",
    "hour_start",
    "hour_end",
    "duration_hours",
    "audience_size",
    "predicted_reach",
    "at_least_one",
    "at_least_two",
    "at_least_three",
    "drift_flag",
    "latency_seconds",
    "model_version",
  ];

  const rows = records.map((record) => {
    const req = record.request;
    const res = record.response;
    const duration = getPredictionDuration(record);
    return [
      csvCell(record.predictionId),
      csvCell(formatPredictionTimestamp(record)),
      csvCell(getPredictionCpm(record)),
      csvCell(req?.hour_start),
      csvCell(req?.hour_end),
      csvCell(duration),
      csvCell(req?.audience_size),
      csvCell(getPredictionReach(record)),
      csvCell(res?.at_least_one),
      csvCell(res?.at_least_two),
      csvCell(res?.at_least_three),
      csvCell(record.driftFlag),
      csvCell(record.latencySeconds),
      csvCell(record.modelVersion),
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

export function downloadCsvFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
