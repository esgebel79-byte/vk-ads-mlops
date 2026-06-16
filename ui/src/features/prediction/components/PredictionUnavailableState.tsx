import { useTranslation } from "react-i18next";
import { EmptyState } from "@/shared/components/EmptyState";

export function PredictionUnavailableState() {
  const { t } = useTranslation();

  return (
    <EmptyState
      title={t("prediction.unavailable.title")}
      description={t("prediction.unavailable.description")}
      className="border-amber-200/80 bg-amber-50/50"
    />
  );
}
