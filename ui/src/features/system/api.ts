import { httpGet } from "@/shared/api/http";
import type { HealthResponse, MetadataResponse } from "./types";

export function getHealth(): Promise<HealthResponse> {
  return httpGet<HealthResponse>("/health");
}

export function getMetadata(): Promise<MetadataResponse> {
  return httpGet<MetadataResponse>("/metadata");
}
