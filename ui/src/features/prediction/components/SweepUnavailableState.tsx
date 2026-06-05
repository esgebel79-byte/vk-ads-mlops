import { useTranslation } from "react-i18next";
import { EmptyState } from "@/shared/components/EmptyState";

type SweepUnavailableStateProps = {
  onRetry?: () => void;
};

export function SweepUnavailableState({
  onRetry: _onRetry,
}: SweepUnavailableStateProps) {
  const { t } = useTranslation();

  return (
    <EmptyState
      title={t("prediction.sweep.unavailable.title")}
      description={t("prediction.sweep.unavailable.description")}
      className="border-amber-200/80 bg-amber-50/50"
    />
  );
}
