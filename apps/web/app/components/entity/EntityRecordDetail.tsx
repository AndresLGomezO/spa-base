import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS } from "@repo/entities";
import { Alert, Button, Heading, Text } from "@repo/ui";
import { Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Pencil } from "lucide-react";

import type { EntityName } from "../../entities/entity-catalog";
import {
  getEntityLabel,
  formatFieldLabel,
} from "../../entities/entity-catalog";
import {
  useEntityCatalog,
  useEntityDefinition,
} from "../../entities/entity-catalog-context";
import { useAnyPermission } from "../../auth/useAnyPermission";
import { useEntityPermissions } from "../../hooks/useEntityPermissions";
import { designLayoutEntityPath } from "../../routing/design-layout-nav";
import { EntityLayoutDetailView } from "./EntityLayoutDetailView";
import { getEntity } from "../../lib/api-client";
import { entityRecordQueryKey } from "../../query/query-client";
import { formatRecordDisplayLabel } from "./format-record-display-label";
import { RelatedRecords } from "./RelatedRecords";
import { EntityPageSkeleton } from "../loading/EntityPageSkeleton";

interface EntityRecordDetailProps {
  readonly entityName: EntityName;
  readonly recordId: string;
  readonly tenantId: string;
}

export function EntityRecordDetail({
  entityName,
  recordId,
  tenantId,
}: EntityRecordDetailProps) {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const definition = useEntityDefinition(entityName);
  const permissions = useEntityPermissions(entityName);
  const canConfigureLayout = useAnyPermission(
    ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS,
  );
  const detailLayout = definition.ui.detailLayout;
  const { items: catalogItems } = useEntityCatalog();
  const entityLabel = getEntityLabel(definition);

  const fkFields = useMemo(
    () =>
      Object.entries(definition.fields)
        .filter(
          ([, meta]) =>
            meta.relation &&
            (meta.relation.type === "many-to-one" ||
              meta.relation.type === "one-to-one"),
        )
        .map(([name]) => name),
    [definition.fields],
  );

  const populateParam = fkFields.length > 0 ? fkFields.join(",") : undefined;

  const { data: record, isLoading } = useQuery({
    queryKey: [...entityRecordQueryKey(entityName, recordId), "detail"],
    queryFn: () =>
      getEntity<Record<string, unknown>>(entityName, recordId, {
        populate: populateParam,
      }),
  });

  const reverseRelations = useMemo(() => {
    const result: {
      childEntityName: string;
      foreignKeyField: string;
      label: string;
    }[] = [];
    for (const item of catalogItems) {
      for (const [fieldName, meta] of Object.entries(item.fields)) {
        if (
          meta.relation?.target === entityName &&
          (meta.relation.type === "many-to-one" ||
            meta.relation.type === "one-to-one")
        ) {
          result.push({
            childEntityName: item.name,
            foreignKeyField: fieldName,
            label: item.ui?.nav?.label ?? item.name,
          });
        }
      }
    }
    return result;
  }, [catalogItems, entityName]);

  if (isLoading) {
    return <EntityPageSkeleton />;
  }

  if (!record) {
    return (
      <Text className="text-muted-foreground">
        {t("entity.notFound", { defaultValue: "Record not found." })}
      </Text>
    );
  }

  const populated = (record._populated ?? {}) as Record<
    string,
    Record<string, unknown> | null
  >;

  const businessFields = Object.keys(definition.fields);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/app/${entityName}`)}
        >
          <ArrowLeft className="mr-1 size-4" />
          {entityLabel}
        </Button>
      </div>

      <div className="flex items-center justify-between gap-4">
        <Heading level={1}>
          {formatRecordDisplayLabel(record, definition.displayField)}
        </Heading>
        <div className="flex items-center gap-2">
          {canConfigureLayout ? (
            <Link to={designLayoutEntityPath("page", entityName)}>
              <Button type="button" variant="outline" size="sm">
                {t("nav.designLayoutPage")}
              </Button>
            </Link>
          ) : null}
          {permissions.canUpdate ? (
            <Link to={`/app/${entityName}?edit=${recordId}`}>
              <Button type="button" variant="outline" size="sm">
                <Pencil className="mr-1 size-4" />
                {t("entity.edit")}
              </Button>
            </Link>
          ) : null}
        </div>
      </div>

      {detailLayout ? (
        <div className="bg-card border-border rounded-lg border p-4">
          <EntityLayoutDetailView record={record} definition={definition} />
        </div>
      ) : (
        <div className="bg-card border-border rounded-lg border p-4">
          {canConfigureLayout ? (
            <Alert className="mb-4">
              <Text>{t("entity.detailLayoutMissing")}</Text>
              <Link
                to={designLayoutEntityPath("page", entityName)}
                className="text-primary mt-2 inline-block text-sm underline"
              >
                {t("entity.detailLayoutMissingAction")}
              </Link>
            </Alert>
          ) : null}
          <dl className="grid gap-4 sm:grid-cols-2">
            {businessFields.map((field) => {
              const fieldMeta = definition.fields[field];
              const isFK =
                fieldMeta?.relation?.type === "many-to-one" ||
                fieldMeta?.relation?.type === "one-to-one";
              const rawValue = record[field];
              const populatedRecord = isFK ? populated[field] : null;

              return (
                <div key={field}>
                  <dt className="text-muted-foreground text-sm font-medium">
                    {formatFieldLabel(field, definition)}
                  </dt>
                  <dd className="mt-1">
                    {isFK && typeof rawValue === "string" && rawValue ? (
                      populatedRecord ? (
                        <Link
                          to={`/app/${fieldMeta.relation!.target}/${rawValue}`}
                          className="text-primary underline"
                        >
                          {formatRecordDisplayLabel(populatedRecord)}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">
                          {rawValue}
                        </span>
                      )
                    ) : (
                      <span>
                        {rawValue != null ? (
                          String(rawValue)
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </span>
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      )}

      {reverseRelations.length > 0 ? (
        <div className="space-y-4">
          {reverseRelations.map((rel) => (
            <RelatedRecords
              key={`${rel.childEntityName}.${rel.foreignKeyField}`}
              parentEntityName={entityName}
              parentId={recordId}
              childEntityName={rel.childEntityName}
              foreignKeyField={rel.foreignKeyField}
              tenantId={tenantId}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
