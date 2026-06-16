import { useTranslation } from "react-i18next";
import { Card } from "@/shared/components/Card";

export function ProbabilityBreakdown() {
  const { t } = useTranslation();

  const items = [
    "prediction.breakdown.atLeastOne",
    "prediction.breakdown.atLeastTwo",
    "prediction.breakdown.atLeastThree",
  ] as const;

  return (
    <Card
      title={t("prediction.breakdown.title")}
      description={t("prediction.breakdown.description")}
    >
      <ul className="space-y-3">
        {items.map((key) => (
          <li
            key={key}
            className="rounded-lg border border-surface-border bg-surface-muted/40 px-4 py-3 text-sm text-slate-700"
          >
            {t(key)}
          </li>
        ))}
      </ul>
    </Card>
  );
}
