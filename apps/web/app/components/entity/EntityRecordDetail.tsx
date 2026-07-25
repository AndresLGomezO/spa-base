import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS } from "@repo/entities";
import {
  Alert,
  AiSparkIcon,
  Button,
  CardFieldImage,
  Heading,
  Markdown,
  SchemaCell,
  Text,
  useThirdRail,
  type DisplayFieldType,
} from "@repo/ui";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Pencil, Workflow } from "lucide-react";

import { useAuth } from "../../auth/AuthContext";
import type { EntityName } from "../../entities/entity-catalog";
import { formatFieldLabel } from "../../entities/entity-catalog";
import {
  useEntityCatalog,
  useEntityDefinition,
} from "../../entities/entity-catalog-context";
import { useAnyPermission } from "../../auth/useAnyPermission";
import { useEntityPermissions } from "../../hooks/useEntityPermissions";
import { RecordHookExecutionsThirdRailPanel } from "../../features/debugger/RecordHookExecutionsThirdRailPanel";
import { summaryChartBlockRenderers } from "../../features/entity-summary/summary-chart-renderers";
import { SummaryCopyMarkdownButton } from "../../features/entity-summary/SummaryCopyMarkdownButton";
import { designLayoutEntityPath } from "../../routing/design-layout-nav";
import { EntityLayoutDetailView } from "./EntityLayoutDetailView";
import {
  getEntity,
  getAiRecordSummary,
  getEntityRelationTargets,
} from "../../lib/api-client";
import { entityRecordQueryKey } from "../../query/query-client";
import { formatRecordDisplayLabel } from "./format-record-display-label";
import { RelatedRecords } from "./RelatedRecords";
import { EntityPageSkeleton } from "../loading/EntityPageSkeleton";
import { EntityBackButton } from "../navigation/EntityBackButton";
import { useEntityReturnNavigation } from "../../routing/entity-navigation";
import { EntityRecordsJsonToolbar } from "./json/EntityRecordsJsonToolbar";
import {
  listManyToManyFieldNames,
  useEntityRecordExportEnvelope,
} from "./json/build-entity-record-export-envelope";
import {
  readEntityFileDisplayValue,
  renderEntityDocumentLink,
  resolveEntityDetailImagePlaceholderSrc,
} from "./entity-file-display.js";
import { readEntityFileDownloadUrl } from "./resolve-entity-layout-image-src.js";
import {
  hasAiSummarySurface,
  isAiNarrativeStale,
  narrativeVariantFromSummaryField,
  resolveSummaryFieldText,
} from "../../features/entity-summary/resolve-summary-tabs";
import { SummaryOutOfSyncBanner } from "../../features/entity-summary/SummaryOutOfSyncBanner";

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
  const definition = useEntityDefinition(entityName);
  const { returnTo, buildEditPath } = useEntityReturnNavigation(entityName);
  const permissions = useEntityPermissions(entityName);
  const { isSuperAdmin } = useAuth();
  const { open: openThirdRail } = useThirdRail();
  const queryClient = useQueryClient();
  const canConfigureLayout = useAnyPermission(
    ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS,
  );
  const recordDetailLayout =
    definition.ui.recordDetailLayout ?? definition.ui.detailLayout;
  const summaryField = recordDetailLayout?.summaryField?.trim();
  const { items: catalogItems } = useEntityCatalog();

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

  const { data: aiSummary } = useQuery({
    queryKey: ["ai-record-summary", entityName, recordId] as const,
    queryFn: () => getAiRecordSummary(entityName, recordId),
    enabled: Boolean(summaryField),
  });

  const manyToManyFieldNames = useMemo(
    () => listManyToManyFieldNames(definition),
    [definition],
  );

  const { data: manyToManyRelations = {} } = useQuery({
    queryKey: [
      ...entityRecordQueryKey(entityName, recordId),
      "export-relations",
      manyToManyFieldNames,
    ],
    queryFn: async () => {
      const relations: Record<string, readonly string[]> = {};
      await Promise.all(
        manyToManyFieldNames.map(async (fieldName) => {
          const targetIds = await getEntityRelationTargets(
            entityName,
            recordId,
            fieldName,
          );
          if (targetIds.length > 0) {
            relations[fieldName] = targetIds;
          }
        }),
      );
      return relations;
    },
    enabled: isSuperAdmin && manyToManyFieldNames.length > 0,
  });

  const exportEnvelope = useEntityRecordExportEnvelope(
    entityName,
    definition,
    record,
    manyToManyRelations,
  );

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
  const summaryVariant = narrativeVariantFromSummaryField(summaryField);
  const summaryText = resolveSummaryFieldText(
    summaryField,
    record,
    aiSummary ?? null,
  );
  const summaryStale = isAiNarrativeStale(aiSummary ?? null, summaryVariant);
  const showSummaryButton =
    Boolean(summaryField) &&
    hasAiSummarySurface(aiSummary ?? null, summaryText);
  const recordLabel = formatRecordDisplayLabel(record, definition.displayField);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <EntityBackButton entityName={entityName} />
      </div>

      <div className="flex items-center justify-between gap-4">
        <Heading level={1}>{recordLabel}</Heading>
        <div className="flex items-center gap-2">
          {showSummaryButton ? (
            <Button
              type="button"
              variant="ai"
              size="sm"
              onClick={() =>
                openThirdRail({
                  title: t("entity.summary.title"),
                  subtitle: recordLabel,
                  headerActions: (
                    <SummaryCopyMarkdownButton getText={() => summaryText} />
                  ),
                  body: (
                    <div className="flex flex-col gap-4">
                      <SummaryOutOfSyncBanner
                        entityName={entityName}
                        recordId={recordId}
                        variant={summaryVariant}
                        stale={summaryStale}
                      />
                      {summaryText.length > 0 ? (
                        <Markdown blockRenderers={summaryChartBlockRenderers}>
                          {summaryText}
                        </Markdown>
                      ) : (
                        <Text className="text-muted-foreground text-sm">
                          {t("entity.summary.emptyDescription")}
                        </Text>
                      )}
                    </div>
                  ),
                  widths: { base: "full", md: "1/2", lg: "1/3" },
                  tone: "ai",
                })
              }
            >
              <AiSparkIcon size={16} animated className="shrink-0" />
              {t("entity.summary.button")}
              {summaryStale ? (
                <span className="ml-1.5 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                  {t("entity.summary.outOfSync")}
                </span>
              ) : null}
            </Button>
          ) : null}
          {isSuperAdmin ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                openThirdRail({
                  title: t("entity.recordHooks.title"),
                  subtitle: t("entity.recordHooks.subtitle", {
                    entity: entityName,
                    id: recordId,
                  }),
                  body: (
                    <RecordHookExecutionsThirdRailPanel
                      entityName={entityName}
                      recordId={recordId}
                      relatedEmailLedgerId={
                        typeof record.emailId === "string" &&
                        record.emailId.trim().length > 0
                          ? record.emailId.trim()
                          : undefined
                      }
                    />
                  ),
                  widths: { base: "full", md: "1/2", lg: "1/3" },
                })
              }
            >
              <Workflow className="mr-1 size-4" />
              {t("entity.recordHooks.button")}
            </Button>
          ) : null}
          {isSuperAdmin && exportEnvelope ? (
            <EntityRecordsJsonToolbar
              entityName={entityName}
              definition={definition}
              exportEnvelope={exportEnvelope}
              onImportSuccess={async () => {
                await queryClient.invalidateQueries({
                  queryKey: entityRecordQueryKey(entityName, recordId),
                });
              }}
            />
          ) : null}
          {canConfigureLayout ? (
            <Link to={designLayoutEntityPath("detail", entityName)}>
              <Button type="button" variant="outline" size="sm">
                {t("nav.designLayoutDetail")}
              </Button>
            </Link>
          ) : null}
          {permissions.canUpdate ? (
            <Link to={buildEditPath(recordId)}>
              <Button type="button" variant="outline" size="sm">
                <Pencil className="mr-1 size-4" />
                {t("entity.edit")}
              </Button>
            </Link>
          ) : null}
        </div>
      </div>

      {recordDetailLayout ? (
        <div className="bg-card border-border rounded-lg border p-4">
          <EntityLayoutDetailView
            record={record}
            definition={definition}
            returnTo={returnTo}
          />
        </div>
      ) : (
        <div className="bg-card border-border rounded-lg border p-4">
          {canConfigureLayout ? (
            <Alert className="mb-4">
              <Text>{t("entity.detailLayoutMissing")}</Text>
              <Link
                to={designLayoutEntityPath("detail", entityName)}
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
                          state={{ returnTo }}
                          className="text-primary underline"
                        >
                          {formatRecordDisplayLabel(populatedRecord)}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">
                          {rawValue}
                        </span>
                      )
                    ) : fieldMeta?.type === "document" ? (
                      renderEntityDocumentLink(rawValue)
                    ) : fieldMeta?.type === "image" ? (
                      <CardFieldImage
                        src={
                          readEntityFileDownloadUrl(rawValue) ??
                          readEntityFileDisplayValue(rawValue)?.downloadUrl ??
                          resolveEntityDetailImagePlaceholderSrc()
                        }
                        alt={
                          readEntityFileDisplayValue(rawValue)?.fileName ??
                          formatFieldLabel(field, definition)
                        }
                        sizePx={64}
                      />
                    ) : (
                      <SchemaCell
                        value={rawValue}
                        fieldType={
                          fieldMeta?.type as DisplayFieldType | undefined
                        }
                        displayFormat={
                          definition.ui.fields?.[field]?.displayFormat
                        }
                        dateDisplayFormat={
                          definition.ui.fields?.[field]?.dateDisplayFormat
                        }
                        fieldName={field}
                      />
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
              returnTo={returnTo}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
