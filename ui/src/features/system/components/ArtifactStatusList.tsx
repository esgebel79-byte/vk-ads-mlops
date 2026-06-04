import { useTranslation } from "react-i18next";
import type { ArtifactStatus } from "../types";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { EmptyState } from "@/shared/components/EmptyState";

type ArtifactStatusListProps = {
  artifacts?: Record<string, ArtifactStatus>;
};

export function ArtifactStatusList({ artifacts }: ArtifactStatusListProps) {
  const { t } = useTranslation();
  const entries = artifacts ? Object.entries(artifacts) : [];

  if (entries.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[32rem] text-left text-sm">
        <thead>
          <tr className="border-b border-surface-border text-slate-500">
            <th className="px-2 py-2 font-medium">{t("artifacts.name")}</th>
            <th className="px-2 py-2 font-medium">{t("artifacts.path")}</th>
            <th className="px-2 py-2 font-medium">{t("artifacts.exists")}</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([name, item]) => (
            <tr
              key={name}
              className="border-b border-surface-border/80 last:border-0"
            >
              <td className="px-2 py-3 font-medium text-slate-800">{name}</td>
              <td className="max-w-xs truncate px-2 py-3 font-mono text-xs text-slate-600">
                {item.path}
              </td>
              <td className="px-2 py-3">
                <StatusBadge
                  label={
                    item.exists
                      ? t("artifacts.present")
                      : t("artifacts.missing")
                  }
                  variant={item.exists ? "success" : "danger"}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
