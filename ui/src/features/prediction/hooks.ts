import { useMutation } from "@tanstack/react-query";
import { predictCampaign, predictCpmSweep } from "./api";
import type { CampaignRequest, CpmSweepRequest } from "./types";

export const predictMutationKey = ["predict"] as const;
export const predictSweepMutationKey = ["predict", "sweep"] as const;

export function usePredictCampaign() {
  return useMutation({
    mutationKey: predictMutationKey,
    mutationFn: (request: CampaignRequest) => predictCampaign(request),
  });
}

export function usePredictCpmSweep() {
  return useMutation({
    mutationKey: predictSweepMutationKey,
    mutationFn: (request: CpmSweepRequest) => predictCpmSweep(request),
  });
}
