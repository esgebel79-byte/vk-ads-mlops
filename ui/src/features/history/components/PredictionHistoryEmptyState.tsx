import { EmptyState } from "@/shared/components/EmptyState";
import { useTranslation } from "react-i18next";

export function PredictionHistoryEmptyState() {
  const { t } = useTranslation();
  return (
    <EmptyState
      title={t("history.empty.title")}
      description={t("history.empty.description")}
    />
  );
}
