import { useTranslation } from "react-i18next";

import { Button, Heading, Text } from "@repo/ui";

import type { EntityDefinitionRecord } from "../../lib/api-client";
import { DataModelsListSkeleton } from "../loading/DataModelsListSkeleton";

interface EntityDefinitionListProps {
  readonly items: readonly EntityDefinitionRecord[];
  readonly isLoading: boolean;
  readonly canCreate: boolean;
  readonly canUpdate?: boolean;
  readonly onCreate: () => void;
  readonly onEdit?: (id: string) => void;
}

export function EntityDefinitionList({
  items,
  isLoading,
  canCreate,
  canUpdate = false,
  onCreate,
  onEdit,
}: EntityDefinitionListProps) {
  const { t } = useTranslation("common");

  if (isLoading) {
    return <DataModelsListSkeleton />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Heading level={2}>{t("dataModels.listTitle")}</Heading>
        {canCreate ? (
          <Button type="button" onClick={onCreate}>
            {t("dataModels.createModel")}
          </Button>
        ) : null}
      </div>

      {items.length === 0 ? (
        <Text>{t("dataModels.empty")}</Text>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-border border-b text-left">
                <th className="px-3 py-2">{t("dataModels.modelName")}</th>
                <th className="px-3 py-2">{t("dataModels.modelLabel")}</th>
                <th className="px-3 py-2">{t("dataModels.fieldsTitle")}</th>
                <th className="px-3 py-2">{t("dataModels.version")}</th>
                {canUpdate ? (
                  <th className="px-3 py-2">{t("entity.actions")}</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-border border-b">
                  <td className="px-3 py-2 font-mono">{item.name}</td>
                  <td className="px-3 py-2">{item.label}</td>
                  <td className="px-3 py-2">{item.fields.length}</td>
                  <td className="px-3 py-2">{item.version}</td>
                  {canUpdate ? (
                    <td className="px-3 py-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => onEdit?.(item.id)}
                      >
                        {t("entity.edit")}
                      </Button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
