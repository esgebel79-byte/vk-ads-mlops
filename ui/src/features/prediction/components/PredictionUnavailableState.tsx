import { useTranslation } from "react-i18next";
import { ErrorState } from "@/shared/components/ErrorState";

type PredictionUnavailableStateProps = {
  detail?: string;
  onRetry?: () => void;
};

export function PredictionUnavailableState({
  detail,
  onRetry,
}: PredictionUnavailableStateProps) {
  const { t } = useTranslation();

  return (
    <ErrorState
      title={t("prediction.unavailable.title")}
      description={
        detail
          ? `${t("prediction.unavailable.description")} ${detail}`
          : t("prediction.unavailable.description")
      }
      onRetry={onRetry}
      className="border-amber-200 bg-amber-50/80 text-left"
    />
  );
}
