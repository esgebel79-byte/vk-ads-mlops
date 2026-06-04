import { httpPost, HttpError } from "@/shared/api/http";
import type {
  CampaignRequest,
  CpmSweepRequest,
  CpmSweepResponse,
  PredictionResponse,
} from "./types";

export { HttpError };

export function predictCampaign(
  request: CampaignRequest,
): Promise<PredictionResponse> {
  return httpPost<PredictionResponse, CampaignRequest>("/predict", request);
}

export function predictCpmSweep(
  request: CpmSweepRequest,
): Promise<CpmSweepResponse> {
  return httpPost<CpmSweepResponse, CpmSweepRequest>(
    "/predict/sweep",
    request,
  );
}

export function isModelUnavailableError(error: unknown): boolean {
  return error instanceof HttpError && error.status === 503;
}

export function isValidationError(error: unknown): boolean {
  return error instanceof HttpError && error.status === 422;
}

export function getPredictionErrorDetail(error: unknown): string | undefined {
  if (error instanceof HttpError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return undefined;
}

export function getSweepErrorDetail(error: unknown): string | undefined {
  return getPredictionErrorDetail(error);
}
