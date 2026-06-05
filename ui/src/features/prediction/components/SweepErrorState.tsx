import { useTranslation } from "react-i18next";
import { ErrorState } from "@/shared/components/ErrorState";
import { getSweepErrorDetail, isValidationError } from "../api";
import { sanitizeMarketerErrorDetail } from "@/shared/lib/sanitizeErrorDetail";

type SweepErrorStateProps = {
  error: unknown;
  onRetry?: () => void;
};

export function SweepErrorState({ error, onRetry }: SweepErrorStateProps) {
  const { t } = useTranslation();

  const title = isValidationError(error)
    ? t("prediction.sweep.errors.validationTitle")
    : t("prediction.sweep.errors.genericTitle");

  const description =
    sanitizeMarketerErrorDetail(getSweepErrorDetail(error)) ??
    t("prediction.sweep.errors.genericDescription");

  return (
    <ErrorState
      title={title}
      description={description}
      onRetry={onRetry}
    />
  );
}
