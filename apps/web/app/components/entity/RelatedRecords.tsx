import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataTable, Heading, Text } from "@repo/ui";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";

import { fetchAllEntityItems } from "../../lib/fetch-all-entity-items";
import type { EntityName } from "../../entities/entity-catalog";
import {
  useEntityCatalog,
  useEntityDefinition,
} from "../../entities/entity-catalog-context";
import {
  getEntityLabel,
  formatFieldLabel,
} from "../../entities/entity-catalog";

interface RelatedRecordsProps {
  readonly parentEntityName: string;
  readonly parentId: string;
  readonly childEntityName: EntityName;
  readonly foreignKeyField: string;
  readonly tenantId: string;
  readonly returnTo?: string;
}

export function RelatedRecords({
  parentId,
  childEntityName,
  foreignKeyField,
  returnTo,
}: RelatedRecordsProps) {
  const { t } = useTranslation("common");
  const { isKnownEntity } = useEntityCatalog();
  const definition = useEntityDefinition(childEntityName);

  const queryKey = useMemo(
    () => ["related-records", childEntityName, foreignKeyField, parentId],
    [childEntityName, foreignKeyField, parentId],
  );

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      fetchAllEntityItems<Record<string, unknown>>(childEntityName, {
        maxItems: 500,
        query: {
          filter: [{ field: foreignKeyField, operator: "==", value: parentId }],
        },
      }),
    enabled: isKnownEntity(childEntityName),
  });

  const items = data ?? [];
  const label = getEntityLabel(definition);

  const visibleFields = useMemo(() => {
    const fields = Object.keys(definition.fields).filter(
      (f) => f !== foreignKeyField,
    );
    return fields.slice(0, 4);
  }, [definition.fields, foreignKeyField]);

  if (isLoading) {
    return null;
  }

  return (
    <div className="space-y-2">
      <Heading level={3} className="text-base">
        {label} ({items.length})
      </Heading>
      {items.length === 0 ? (
        <Text className="text-muted-foreground text-sm">
          {t("entity.noRelatedRecords", {
            defaultValue: "No related records found.",
          })}
        </Text>
      ) : (
        <DataTable
          columns={visibleFields.map((field) => ({
            id: field,
            header: formatFieldLabel(field, definition),
            cell: (item) => {
              const record = item as Record<string, unknown>;
              const value = record[field];
              return <span>{value != null ? String(value) : ""}</span>;
            },
          }))}
          rows={items}
          getRowId={(item) => String(item.id)}
          page={1}
          totalCount={items.length}
          pageSize={10}
          onPageChange={() => {}}
          emptyMessage={t("entity.empty")}
          loadingMessage={t("table.loading")}
          actionsColumn={{
            id: "view",
            header: "",
            cell: (item) => (
              <Link
                to={`/app/${childEntityName}/${String(item.id)}`}
                state={returnTo ? { returnTo } : undefined}
                className="text-primary text-sm underline"
              >
                {t("entity.view", { defaultValue: "View" })}
              </Link>
            ),
          }}
        />
      )}
    </div>
  );
}
