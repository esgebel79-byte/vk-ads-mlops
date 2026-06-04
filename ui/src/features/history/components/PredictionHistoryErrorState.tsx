import { ErrorState } from "@/shared/components/ErrorState";

type PredictionHistoryErrorStateProps = {
  onRetry: () => void;
};

export function PredictionHistoryErrorState({
  onRetry,
}: PredictionHistoryErrorStateProps) {
  return <ErrorState onRetry={onRetry} />;
}
