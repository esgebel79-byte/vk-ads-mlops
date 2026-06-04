import { useMutation } from "@tanstack/react-query";
import { predictCampaign } from "./api";
import type { CampaignRequest } from "./types";

export const predictMutationKey = ["predict"] as const;

export function usePredictCampaign() {
  return useMutation({
    mutationKey: predictMutationKey,
    mutationFn: (request: CampaignRequest) => predictCampaign(request),
  });
}
