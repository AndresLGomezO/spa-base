import { useTranslation } from "react-i18next";

import { Button, Heading, Text } from "@repo/ui";

import type { EntityDefinitionRecord } from "../../lib/api-client";

interface EntityDefinitionListProps {
  readonly items: readonly EntityDefinitionRecord[];
  readonly isLoading: boolean;
  readonly canCreate: boolean;
  readonly onCreate: () => void;
}

export function EntityDefinitionList({
  items,
  isLoading,
  canCreate,
  onCreate,
}: EntityDefinitionListProps) {
  const { t } = useTranslation("common");

  if (isLoading) {
    return <Text>{t("dataModels.loading")}</Text>;
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
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-border border-b">
                  <td className="px-3 py-2 font-mono">{item.name}</td>
                  <td className="px-3 py-2">{item.label}</td>
                  <td className="px-3 py-2">{item.fields.length}</td>
                  <td className="px-3 py-2">{item.version}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
