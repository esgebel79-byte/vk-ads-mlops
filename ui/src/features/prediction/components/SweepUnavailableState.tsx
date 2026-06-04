import { useTranslation } from "react-i18next";
import { ErrorState } from "@/shared/components/ErrorState";

type SweepUnavailableStateProps = {
  detail?: string;
  onRetry?: () => void;
};

export function SweepUnavailableState({
  detail,
  onRetry,
}: SweepUnavailableStateProps) {
  const { t } = useTranslation();

  return (
    <ErrorState
      title={t("prediction.sweep.unavailable.title")}
      description={
        detail
          ? `${t("prediction.sweep.unavailable.description")} ${detail}`
          : t("prediction.sweep.unavailable.description")
      }
      onRetry={onRetry}
      className="border-amber-200 bg-amber-50/80 text-left"
    />
  );
}
