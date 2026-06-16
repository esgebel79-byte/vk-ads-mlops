import { useQuery } from "@tanstack/react-query";
import { getHealth, getMetadata } from "./api";

export const healthQueryKey = ["health"] as const;
export const metadataQueryKey = ["metadata"] as const;

export function useHealth() {
  return useQuery({
    queryKey: healthQueryKey,
    queryFn: getHealth,
    staleTime: 30_000,
    retry: 1,
  });
}

export function useMetadata() {
  return useQuery({
    queryKey: metadataQueryKey,
    queryFn: getMetadata,
    staleTime: 30_000,
    retry: 1,
  });
}
