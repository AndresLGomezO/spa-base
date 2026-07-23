import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataTable, Heading, SchemaCell, Text } from "@repo/ui";
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
import {
  getEntityCellDisplayMeta,
  getEntityCellSchemaValue,
} from "./resolve-entity-cell-value.js";

const RELATED_RECORDS_PAGE_SIZE = 10;
const EMPTY_RELATED_RECORDS: readonly Record<string, unknown>[] = [];

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
  const [page, setPage] = useState(1);

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

  const items = data ?? EMPTY_RELATED_RECORDS;
  const label = getEntityLabel(definition);

  useEffect(() => {
    setPage(1);
  }, [childEntityName, foreignKeyField, parentId]);

  useEffect(() => {
    const totalPages =
      items.length === 0
        ? 1
        : Math.ceil(items.length / RELATED_RECORDS_PAGE_SIZE);
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [items.length, page]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * RELATED_RECORDS_PAGE_SIZE;
    return items.slice(start, start + RELATED_RECORDS_PAGE_SIZE);
  }, [items, page]);

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
              const meta = getEntityCellDisplayMeta(field, definition);
              const value = getEntityCellSchemaValue(
                record,
                field,
                definition,
                () => null,
              );
              return (
                <SchemaCell
                  value={value}
                  fieldType={meta.fieldType}
                  displayFormat={meta.displayFormat}
                  dateDisplayFormat={meta.dateDisplayFormat}
                  fallbackImageUrl={meta.fallbackImageUrl}
                  fieldName={field}
                />
              );
            },
          }))}
          rows={pageRows}
          getRowId={(item) => String(item.id)}
          page={page}
          totalCount={items.length}
          pageSize={RELATED_RECORDS_PAGE_SIZE}
          onPageChange={setPage}
          emptyMessage={t("entity.empty")}
          loadingMessage={t("table.loading")}
          paginationLabels={{
            previousPage: t("table.paginationPrevious"),
            nextPage: t("table.paginationNext"),
            page: (p) => t("table.paginationPage", { page: p }),
          }}
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
