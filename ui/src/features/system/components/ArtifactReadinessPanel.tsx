import { useTranslation } from "react-i18next";
import { useHealth } from "../hooks";
import { ArtifactStatusList } from "./ArtifactStatusList";
import { Card } from "@/shared/components/Card";
import { ErrorState } from "@/shared/components/ErrorState";
import { LoadingState } from "@/shared/components/LoadingState";

export function ArtifactReadinessPanel() {
  const { t } = useTranslation();
  const health = useHealth();

  return (
    <Card title={t("artifacts.title")}>
      {health.isLoading ? <LoadingState /> : null}
      {health.isError ? (
        <ErrorState onRetry={() => void health.refetch()} />
      ) : null}
      {health.data?.artifacts ? (
        <ArtifactStatusList artifacts={health.data.artifacts} />
      ) : health.data ? (
        <p className="text-sm text-slate-600">{t("states.emptyDescription")}</p>
      ) : null}
    </Card>
  );
}
