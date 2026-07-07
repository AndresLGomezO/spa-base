import type { MetricBindingSource } from "@repo/entities";
import { defaultDateFilterParam } from "@repo/ui-builder-core";
import { Input, Text } from "@repo/ui";
import { AdminSelect as Select } from "~/components/admin/AdminSelect";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import type { SerializableEntityDefinition } from "@repo/entities";
import type { MetricDateGranularity } from "@repo/metrics-engine/browser";
import { listLayoutFieldOptions } from "@repo/entities";

import { useEntityCatalog } from "../../entities/entity-catalog-context";

interface MetricBindingSourceEditorProps {
  readonly fieldName: string;
  readonly source: MetricBindingSource | undefined;
  readonly definition?: SerializableEntityDefinition;
  readonly filterFieldOptions?: readonly string[];
  readonly dateGranularity?: MetricDateGranularity;
  readonly onChange: (source: MetricBindingSource) => void;
}

const BINDING_TYPES = [
  "static",
  "entityField",
  "listFilter",
  "routeParam",
] as const;

type BindingType = (typeof BINDING_TYPES)[number] | "dashboardDate";

function resolveBindingEditorType(
  source: MetricBindingSource | undefined,
  dateGranularity?: MetricDateGranularity,
): BindingType {
  if (source?.type === "dashboardDateFilter") {
    return "dashboardDate";
  }

  if (
    source?.type === "routeParam" &&
    dateGranularity &&
    source.param === defaultDateFilterParam(dateGranularity)
  ) {
    return "dashboardDate";
  }

  if (source?.type === "relativePeriod") {
    return "static";
  }

  if (
    source?.type === "static" ||
    source?.type === "entityField" ||
    source?.type === "listFilter" ||
    source?.type === "routeParam"
  ) {
    return source.type;
  }

  return "static";
}

export function MetricBindingSourceEditor({
  fieldName,
  source,
  definition,
  filterFieldOptions = [],
  dateGranularity,
  onChange,
}: MetricBindingSourceEditorProps) {
  const { t } = useTranslation("common");
  const { getDefinition } = useEntityCatalog();
  const type = resolveBindingEditorType(source, dateGranularity);
  const entityFieldOptions = useMemo(
    () =>
      definition
        ? listLayoutFieldOptions(definition, {
            resolveTarget: (target) => getDefinition(target),
          })
        : [],
    [definition, getDefinition],
  );
  const showDashboardDateOption = Boolean(dateGranularity);
  const dashboardDateParam = dateGranularity
    ? defaultDateFilterParam(dateGranularity)
    : "month";

  return (
    <div className="border-border flex flex-col gap-2 rounded-md border p-2">
      <Text className="text-xs font-medium">{fieldName}</Text>
      {dateGranularity ? (
        <Text className="text-muted-foreground text-xs">
          {t("entity.viewSettings.metrics.dateBucketHint", {
            format: t(`metrics.dateGranularity.formats.${dateGranularity}`),
          })}
        </Text>
      ) : null}
      {showDashboardDateOption ? (
        <Text className="text-muted-foreground text-xs">
          {t("entity.viewSettings.metrics.dashboardDateHint")}
        </Text>
      ) : null}
      <label className="flex flex-col gap-1">
        <span className="text-muted-foreground text-xs">
          {t("entity.viewSettings.metrics.bindingType")}
        </span>
        <Select
          value={type}
          onChange={(event) => {
            const nextType = event.target.value as BindingType;
            switch (nextType) {
              case "static":
                onChange({ type: "static", value: "" });
                break;
              case "entityField":
                onChange({
                  type: "entityField",
                  fieldPath: entityFieldOptions[0] ?? fieldName,
                });
                break;
              case "listFilter":
                onChange({
                  type: "listFilter",
                  field: filterFieldOptions[0] ?? fieldName,
                });
                break;
              case "dashboardDate":
                onChange({ type: "dashboardDateFilter" });
                break;
              case "routeParam":
                onChange({ type: "routeParam", param: fieldName });
                break;
              default:
                break;
            }
          }}
        >
          {BINDING_TYPES.map((bindingType) => (
            <option key={bindingType} value={bindingType}>
              {t(`entity.viewSettings.metrics.binding.${bindingType}`)}
            </option>
          ))}
          {showDashboardDateOption ? (
            <option value="dashboardDate">
              {t("entity.viewSettings.metrics.binding.dashboardDate")}
            </option>
          ) : null}
        </Select>
      </label>

      {type === "static" ? (
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground text-xs">
            {t("entity.viewSettings.metrics.staticValue")}
          </span>
          <Input
            value={String(source?.type === "static" ? source.value : "")}
            onChange={(event) =>
              onChange({ type: "static", value: event.target.value })
            }
          />
        </label>
      ) : null}

      {type === "entityField" ? (
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground text-xs">
            {t("entity.viewSettings.field")}
          </span>
          <Select
            value={
              source?.type === "entityField" ? source.fieldPath : fieldName
            }
            onChange={(event) =>
              onChange({ type: "entityField", fieldPath: event.target.value })
            }
          >
            {entityFieldOptions.map((fieldPath) => (
              <option key={fieldPath} value={fieldPath}>
                {fieldPath}
              </option>
            ))}
          </Select>
        </label>
      ) : null}

      {type === "listFilter" ? (
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground text-xs">
            {t("entity.viewSettings.metrics.filterField")}
          </span>
          <Select
            value={source?.type === "listFilter" ? source.field : fieldName}
            onChange={(event) =>
              onChange({ type: "listFilter", field: event.target.value })
            }
          >
            {filterFieldOptions.map((field) => (
              <option key={field} value={field}>
                {field}
              </option>
            ))}
          </Select>
        </label>
      ) : null}

      {type === "routeParam" ? (
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground text-xs">
            {t("entity.viewSettings.metrics.routeParam")}
          </span>
          <Input
            value={source?.type === "routeParam" ? source.param : fieldName}
            onChange={(event) =>
              onChange({ type: "routeParam", param: event.target.value })
            }
          />
        </label>
      ) : null}

      {type === "dashboardDate" ? (
        <Text className="text-muted-foreground text-xs">
          {t("entity.viewSettings.metrics.dashboardDateBindingDetail", {
            param: dashboardDateParam,
          })}
        </Text>
      ) : null}
    </div>
  );
}
