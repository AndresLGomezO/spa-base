import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, FieldLabel, Input, Text } from "@repo/ui";
import { AdminSelect as Select } from "~/components/admin/AdminSelect";
import type {
  AiContextSectionBlock,
  AiContextSectionBlockKind,
} from "@repo/ai-context/storage";

import {
  listEntityQueryDefinitions,
  listMetricDefinitions,
} from "../../../lib/api-client";
import { getEntityLabel } from "../../../entities/entity-catalog";
import { useEntityCatalog } from "../../../entities/entity-catalog-context";
import { EntityFieldPathSelect } from "../../../components/entity/EntityFieldPathSelect";

const controlClassName =
  "border-input bg-background flex h-9 w-full rounded-md border px-3 py-1.5 text-sm";
const textareaClassName =
  "border-input bg-background flex min-h-[96px] w-full rounded-md border px-3 py-2 text-sm";

function createDefaultBlock(
  kind: AiContextSectionBlockKind,
): AiContextSectionBlock {
  switch (kind) {
    case "staticMarkdown":
      return { kind, content: "" };
    case "entityField":
      return {
        kind,
        entityName: "",
        source: "singleton",
        field: "",
      };
    case "entityRecordsSummary":
      return {
        kind,
        entityName: "",
        fields: ["aiSummaryText"],
        limit: 10,
        joinAs: "list",
      };
    case "metricValue":
      return {
        kind,
        metricDefinitionId: "",
        format: "raw",
      };
    case "savedQueryTop":
      return {
        kind,
        queryDefinitionId: "",
        limit: 10,
        fields: ["name"],
      };
  }
}

interface UserAiContextBlockEditorProps {
  readonly block: AiContextSectionBlock;
  readonly index: number;
  readonly disabled?: boolean;
  readonly onChange: (block: AiContextSectionBlock) => void;
  readonly onRemove: () => void;
  readonly onMoveUp?: () => void;
  readonly onMoveDown?: () => void;
}

export function UserAiContextBlockEditor({
  block,
  index,
  disabled = false,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: UserAiContextBlockEditorProps) {
  const { t } = useTranslation("common");
  const { items: entities } = useEntityCatalog();
  const [metrics, setMetrics] = useState<
    readonly { id: string; name: string }[]
  >([]);
  const [queries, setQueries] = useState<
    readonly { id: string; name: string }[]
  >([]);

  useEffect(() => {
    void listMetricDefinitions()
      .then((result) =>
        setMetrics(
          result.items.map((item) => ({ id: item.id, name: item.name })),
        ),
      )
      .catch(() => setMetrics([]));
    void listEntityQueryDefinitions()
      .then((result) =>
        setQueries(
          result.items.map((item) => ({ id: item.id, name: item.name })),
        ),
      )
      .catch(() => setQueries([]));
  }, []);

  const entity = useMemo(() => {
    if (block.kind !== "entityField" && block.kind !== "entityRecordsSummary") {
      return undefined;
    }
    return entities.find((entry) => entry.name === block.entityName);
  }, [block, entities]);

  return (
    <div className="border-border space-y-3 rounded-md border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Text className="text-sm font-medium">
          {t("userAiContext.blocks.title", { index: index + 1 })}
        </Text>
        <div className="flex flex-wrap gap-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled || !onMoveUp}
            onClick={onMoveUp}
          >
            ↑
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled || !onMoveDown}
            onClick={onMoveDown}
          >
            ↓
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled}
            onClick={onRemove}
          >
            {t("userAiContext.blocks.remove")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <FieldLabel>{t("userAiContext.blocks.kind")}</FieldLabel>
          <Select
            className={controlClassName}
            disabled={disabled}
            value={block.kind}
            onChange={(event) =>
              onChange(
                createDefaultBlock(
                  event.target.value as AiContextSectionBlockKind,
                ),
              )
            }
          >
            <option value="staticMarkdown">
              {t("userAiContext.blocks.kinds.staticMarkdown")}
            </option>
            <option value="entityField">
              {t("userAiContext.blocks.kinds.entityField")}
            </option>
            <option value="entityRecordsSummary">
              {t("userAiContext.blocks.kinds.entityRecordsSummary")}
            </option>
            <option value="metricValue">
              {t("userAiContext.blocks.kinds.metricValue")}
            </option>
            <option value="savedQueryTop">
              {t("userAiContext.blocks.kinds.savedQueryTop")}
            </option>
          </Select>
        </div>
        <div className="space-y-1">
          <FieldLabel>{t("userAiContext.blocks.label")}</FieldLabel>
          <Input
            className={controlClassName}
            disabled={disabled}
            value={block.label ?? ""}
            onChange={(event) =>
              onChange({
                ...block,
                label: event.target.value.trim() || undefined,
              } as AiContextSectionBlock)
            }
          />
        </div>
      </div>

      {block.kind === "staticMarkdown" ? (
        <div className="space-y-1">
          <FieldLabel>{t("userAiContext.blocks.content")}</FieldLabel>
          <textarea
            className={textareaClassName}
            disabled={disabled}
            value={block.content}
            onChange={(event) =>
              onChange({ ...block, content: event.target.value })
            }
          />
        </div>
      ) : null}

      {block.kind === "entityField" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <FieldLabel>{t("userAiContext.blocks.entity")}</FieldLabel>
            <Select
              className={controlClassName}
              disabled={disabled}
              value={block.entityName}
              onChange={(event) =>
                onChange({
                  ...block,
                  entityName: event.target.value,
                  field: "",
                })
              }
            >
              <option value="">{t("userAiContext.blocks.selectEntity")}</option>
              {entities.map((entry) => (
                <option key={entry.name} value={entry.name}>
                  {getEntityLabel(entry)}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <FieldLabel>{t("userAiContext.blocks.field")}</FieldLabel>
            <EntityFieldPathSelect
              entity={entity}
              value={block.field}
              disabled={disabled}
              className={controlClassName}
              onChange={(field) => onChange({ ...block, field })}
            />
          </div>
          <div className="space-y-1">
            <FieldLabel>{t("userAiContext.blocks.source")}</FieldLabel>
            <Select
              className={controlClassName}
              disabled={disabled}
              value={block.source}
              onChange={(event) =>
                onChange({
                  ...block,
                  source: event.target.value as
                    | "singleton"
                    | "recordId"
                    | "firstMatch",
                })
              }
            >
              <option value="singleton">
                {t("userAiContext.blocks.sources.singleton")}
              </option>
              <option value="firstMatch">
                {t("userAiContext.blocks.sources.firstMatch")}
              </option>
              <option value="recordId">
                {t("userAiContext.blocks.sources.recordId")}
              </option>
            </Select>
          </div>
          {block.source === "recordId" ? (
            <div className="space-y-1">
              <FieldLabel>{t("userAiContext.blocks.recordId")}</FieldLabel>
              <Input
                className={controlClassName}
                disabled={disabled}
                value={block.recordId ?? ""}
                onChange={(event) =>
                  onChange({
                    ...block,
                    recordId: event.target.value.trim() || undefined,
                  })
                }
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {block.kind === "entityRecordsSummary" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <FieldLabel>{t("userAiContext.blocks.entity")}</FieldLabel>
            <Select
              className={controlClassName}
              disabled={disabled}
              value={block.entityName}
              onChange={(event) =>
                onChange({ ...block, entityName: event.target.value })
              }
            >
              <option value="">{t("userAiContext.blocks.selectEntity")}</option>
              {entities.map((entry) => (
                <option key={entry.name} value={entry.name}>
                  {getEntityLabel(entry)}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <FieldLabel>{t("userAiContext.blocks.fieldsCsv")}</FieldLabel>
            <Input
              className={controlClassName}
              disabled={disabled}
              value={block.fields.join(", ")}
              onChange={(event) =>
                onChange({
                  ...block,
                  fields: event.target.value
                    .split(",")
                    .map((part) => part.trim())
                    .filter(Boolean),
                })
              }
            />
          </div>
          <div className="space-y-1">
            <FieldLabel>{t("userAiContext.blocks.limit")}</FieldLabel>
            <Input
              type="number"
              min={1}
              max={20}
              className={controlClassName}
              disabled={disabled}
              value={block.limit}
              onChange={(event) =>
                onChange({
                  ...block,
                  limit: Math.min(
                    20,
                    Math.max(1, Number.parseInt(event.target.value, 10) || 1),
                  ),
                })
              }
            />
          </div>
          <div className="space-y-1">
            <FieldLabel>{t("userAiContext.blocks.joinAs")}</FieldLabel>
            <Select
              className={controlClassName}
              disabled={disabled}
              value={block.joinAs}
              onChange={(event) =>
                onChange({
                  ...block,
                  joinAs: event.target.value as "list" | "table",
                })
              }
            >
              <option value="list">
                {t("userAiContext.blocks.joinAsList")}
              </option>
              <option value="table">
                {t("userAiContext.blocks.joinAsTable")}
              </option>
            </Select>
          </div>
        </div>
      ) : null}

      {block.kind === "metricValue" ? (
        <div className="space-y-1">
          <FieldLabel>{t("userAiContext.blocks.metric")}</FieldLabel>
          <Select
            className={controlClassName}
            disabled={disabled}
            value={block.metricDefinitionId}
            onChange={(event) =>
              onChange({ ...block, metricDefinitionId: event.target.value })
            }
          >
            <option value="">{t("userAiContext.blocks.selectMetric")}</option>
            {metrics.map((metric) => (
              <option key={metric.id} value={metric.id}>
                {metric.name}
              </option>
            ))}
          </Select>
        </div>
      ) : null}

      {block.kind === "savedQueryTop" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <FieldLabel>{t("userAiContext.blocks.query")}</FieldLabel>
            <Select
              className={controlClassName}
              disabled={disabled}
              value={block.queryDefinitionId}
              onChange={(event) =>
                onChange({ ...block, queryDefinitionId: event.target.value })
              }
            >
              <option value="">{t("userAiContext.blocks.selectQuery")}</option>
              {queries.map((query) => (
                <option key={query.id} value={query.id}>
                  {query.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <FieldLabel>{t("userAiContext.blocks.fieldsCsv")}</FieldLabel>
            <Input
              className={controlClassName}
              disabled={disabled}
              value={block.fields.join(", ")}
              onChange={(event) =>
                onChange({
                  ...block,
                  fields: event.target.value
                    .split(",")
                    .map((part) => part.trim())
                    .filter(Boolean),
                })
              }
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export { createDefaultBlock };
