import type { MetricBindingSource } from "@repo/entities";
import { Input, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import type { SerializableEntityDefinition } from "@repo/entities";
import { listCardLayoutFieldOptions } from "@repo/entities";

const SELECT_CLASS =
  "border-input bg-background ring-offset-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

interface MetricBindingSourceEditorProps {
  readonly fieldName: string;
  readonly source: MetricBindingSource | undefined;
  readonly definition?: SerializableEntityDefinition;
  readonly filterFieldOptions?: readonly string[];
  readonly onChange: (source: MetricBindingSource) => void;
}

const BINDING_TYPES = [
  "static",
  "entityField",
  "listFilter",
  "routeParam",
] as const;

export function MetricBindingSourceEditor({
  fieldName,
  source,
  definition,
  filterFieldOptions = [],
  onChange,
}: MetricBindingSourceEditorProps) {
  const { t } = useTranslation("common");
  const type = source?.type ?? "static";
  const entityFieldOptions = definition
    ? listCardLayoutFieldOptions(definition)
    : [];

  return (
    <div className="border-border flex flex-col gap-2 rounded-md border p-2">
      <Text className="text-xs font-medium">{fieldName}</Text>
      <label className="flex flex-col gap-1">
        <span className="text-muted-foreground text-xs">
          {t("entity.viewSettings.metrics.bindingType")}
        </span>
        <select
          className={SELECT_CLASS}
          value={type}
          onChange={(event) => {
            const nextType = event.target
              .value as (typeof BINDING_TYPES)[number];
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
        </select>
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
          <select
            className={SELECT_CLASS}
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
          </select>
        </label>
      ) : null}

      {type === "listFilter" ? (
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground text-xs">
            {t("entity.viewSettings.metrics.filterField")}
          </span>
          <select
            className={SELECT_CLASS}
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
          </select>
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
    </div>
  );
}
