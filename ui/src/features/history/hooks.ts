import { useQuery } from "@tanstack/react-query";
import { getRecentPredictions } from "./api";

export const recentPredictionsQueryKey = ["predictions", "recent"] as const;

export function useRecentPredictions() {
  return useQuery({
    queryKey: recentPredictionsQueryKey,
    queryFn: () => getRecentPredictions(),
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 1,
  });
}
