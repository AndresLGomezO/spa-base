import { useTranslation } from "react-i18next";

import { Button, Heading, Text } from "@repo/ui";

import type { HookRecord } from "../../lib/api-client";
import { HookListSkeleton } from "../loading/HookListSkeleton";

interface HookListProps {
  readonly items: readonly HookRecord[];
  readonly isLoading: boolean;
  readonly canCreate: boolean;
  readonly canUpdate?: boolean;
  readonly onCreate: () => void;
  readonly onEdit?: (id: string) => void;
}

export function HookList({
  items,
  isLoading,
  canCreate,
  canUpdate = false,
  onCreate,
  onEdit,
}: HookListProps) {
  const { t } = useTranslation("common");

  if (isLoading) {
    return <HookListSkeleton />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Heading level={2}>{t("hooks.listTitle")}</Heading>
        {canCreate ? (
          <Button type="button" onClick={onCreate}>
            {t("hooks.create")}
          </Button>
        ) : null}
      </div>

      {items.length === 0 ? (
        <Text>{t("hooks.empty")}</Text>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-border border-b text-left">
                <th className="px-3 py-2">{t("hooks.name")}</th>
                <th className="px-3 py-2">{t("hooks.entity")}</th>
                <th className="px-3 py-2">{t("hooks.event")}</th>
                <th className="px-3 py-2">{t("hooks.enabled")}</th>
                <th className="px-3 py-2">{t("hooks.actionCount")}</th>
                {canUpdate ? (
                  <th className="px-3 py-2">{t("entity.actions")}</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-border border-b">
                  <td className="px-3 py-2">{item.name}</td>
                  <td className="px-3 py-2 font-mono">{item.entity}</td>
                  <td className="px-3 py-2 font-mono">{item.event}</td>
                  <td className="px-3 py-2">
                    {item.enabled
                      ? t("hooks.enabledOn")
                      : t("hooks.enabledOff")}
                  </td>
                  <td className="px-3 py-2">{item.config.actions.length}</td>
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
