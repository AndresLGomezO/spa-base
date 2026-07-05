import type { MetricDefinitionParameter } from "@repo/metrics-engine/browser";
import { Button, FieldLabel, Input, Select, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

type MetricParameterValueType = MetricDefinitionParameter["valueType"];

const VALUE_TYPES: readonly MetricParameterValueType[] = [
  "dateBucket",
  "string",
  "number",
];

const GRANULARITIES = ["day", "month", "year"] as const;
const SHIFT_UNITS = ["day", "month", "year"] as const;

const selectClassName =
  "border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm";

interface MetricParametersEditorProps {
  readonly parameters: readonly MetricDefinitionParameter[];
  readonly onChange: (parameters: readonly MetricDefinitionParameter[]) => void;
  readonly readOnly?: boolean;
}

function createEmptyParameter(): MetricDefinitionParameter {
  return {
    name: "",
    valueType: "string",
  };
}

function updateParameterAtIndex(
  parameters: readonly MetricDefinitionParameter[],
  index: number,
  patch: Partial<MetricDefinitionParameter>,
): MetricDefinitionParameter[] {
  return parameters.map((parameter, parameterIndex) =>
    parameterIndex === index ? { ...parameter, ...patch } : parameter,
  );
}

export function MetricParametersEditor({
  parameters,
  onChange,
  readOnly = false,
}: MetricParametersEditorProps) {
  const { t } = useTranslation("common");

  function handleAddParameter() {
    onChange([...parameters, createEmptyParameter()]);
  }

  function handleRemoveParameter(index: number) {
    onChange(
      parameters.filter((_, parameterIndex) => parameterIndex !== index),
    );
  }

  return (
    <div className="space-y-3">
      {parameters.length === 0 ? (
        <Text className="text-muted-foreground text-sm">
          {t("metrics.computed.parameters.empty", {
            defaultValue: "No parameters defined.",
          })}
        </Text>
      ) : null}

      {parameters.map((parameter, index) => {
        const otherParameterNames = parameters
          .filter((_, parameterIndex) => parameterIndex !== index)
          .map((item) => item.name.trim())
          .filter((name) => name.length > 0);
        const deriveFromEnabled = parameter.deriveFrom !== undefined;

        return (
          <div
            key={`metric-parameter-${index}`}
            className="border-border space-y-3 rounded-md border p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <Text className="text-muted-foreground text-xs font-medium">
                {t("metrics.computed.parameters.itemLabel", {
                  index: index + 1,
                  defaultValue: "Parameter {{index}}",
                })}
              </Text>
              {!readOnly ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleRemoveParameter(index)}
                >
                  {t("metrics.computed.parameters.remove", {
                    defaultValue: "Remove",
                  })}
                </Button>
              ) : null}
            </div>

            <div>
              <FieldLabel htmlFor={`metric-parameter-name-${index}`}>
                {t("metrics.computed.parameters.name", {
                  defaultValue: "Name",
                })}
              </FieldLabel>
              <Input
                id={`metric-parameter-name-${index}`}
                value={parameter.name}
                disabled={readOnly}
                placeholder={t("metrics.computed.parameters.namePlaceholder", {
                  defaultValue: "currentPeriod",
                })}
                onChange={(event) =>
                  onChange(
                    updateParameterAtIndex(parameters, index, {
                      name: event.target.value,
                    }),
                  )
                }
              />
            </div>

            <div>
              <FieldLabel htmlFor={`metric-parameter-value-type-${index}`}>
                {t("metrics.computed.parameters.valueType", {
                  defaultValue: "Value type",
                })}
              </FieldLabel>
              <Select
                id={`metric-parameter-value-type-${index}`}
                className={selectClassName}
                value={parameter.valueType}
                disabled={readOnly}
                onChange={(event) => {
                  const nextValueType = event.target
                    .value as MetricParameterValueType;
                  const patch: Partial<MetricDefinitionParameter> = {
                    valueType: nextValueType,
                  };
                  if (nextValueType !== "dateBucket") {
                    patch.granularity = undefined;
                    patch.deriveFrom = undefined;
                  } else if (!parameter.granularity) {
                    patch.granularity = "month";
                  }
                  onChange(updateParameterAtIndex(parameters, index, patch));
                }}
              >
                {VALUE_TYPES.map((valueType) => (
                  <option key={valueType} value={valueType}>
                    {t(`metrics.computed.parameters.valueTypes.${valueType}`, {
                      defaultValue: valueType,
                    })}
                  </option>
                ))}
              </Select>
            </div>

            {parameter.valueType === "dateBucket" ? (
              <div>
                <FieldLabel htmlFor={`metric-parameter-granularity-${index}`}>
                  {t("metrics.computed.parameters.granularity", {
                    defaultValue: "Granularity",
                  })}
                </FieldLabel>
                <Select
                  id={`metric-parameter-granularity-${index}`}
                  className={selectClassName}
                  value={parameter.granularity ?? "month"}
                  disabled={readOnly}
                  onChange={(event) =>
                    onChange(
                      updateParameterAtIndex(parameters, index, {
                        granularity: event.target.value as
                          | "day"
                          | "month"
                          | "year",
                      }),
                    )
                  }
                >
                  {GRANULARITIES.map((granularity) => (
                    <option key={granularity} value={granularity}>
                      {t(`metrics.dateGranularity.${granularity}`, {
                        defaultValue: granularity,
                      })}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}

            {parameter.valueType === "dateBucket" ? (
              <div className="space-y-3 rounded-md border border-dashed p-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={deriveFromEnabled}
                    disabled={readOnly}
                    onChange={(event) => {
                      if (!event.target.checked) {
                        onChange(
                          updateParameterAtIndex(parameters, index, {
                            deriveFrom: undefined,
                          }),
                        );
                        return;
                      }
                      const sourceParameter =
                        otherParameterNames[0] ?? parameter.name;
                      onChange(
                        updateParameterAtIndex(parameters, index, {
                          deriveFrom: {
                            parameter: sourceParameter,
                            shift: { unit: "month", offset: -1 },
                          },
                        }),
                      );
                    }}
                  />
                  <span className="text-sm">
                    {t("metrics.computed.parameters.deriveFromEnabled", {
                      defaultValue: "Derive from another parameter",
                    })}
                  </span>
                </label>

                {deriveFromEnabled && parameter.deriveFrom ? (
                  <>
                    <div>
                      <FieldLabel
                        htmlFor={`metric-parameter-derive-source-${index}`}
                      >
                        {t("metrics.computed.parameters.deriveFromSource", {
                          defaultValue: "Source parameter",
                        })}
                      </FieldLabel>
                      <Select
                        id={`metric-parameter-derive-source-${index}`}
                        className={selectClassName}
                        value={parameter.deriveFrom.parameter}
                        disabled={readOnly || otherParameterNames.length === 0}
                        onChange={(event) =>
                          onChange(
                            updateParameterAtIndex(parameters, index, {
                              deriveFrom: {
                                ...parameter.deriveFrom!,
                                parameter: event.target.value,
                              },
                            }),
                          )
                        }
                      >
                        {otherParameterNames.length === 0 ? (
                          <option value="">
                            {t("metrics.computed.parameters.noSourceOptions", {
                              defaultValue: "Add another date parameter first",
                            })}
                          </option>
                        ) : null}
                        {otherParameterNames.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <FieldLabel
                          htmlFor={`metric-parameter-derive-unit-${index}`}
                        >
                          {t("metrics.computed.parameters.shiftUnit", {
                            defaultValue: "Shift unit",
                          })}
                        </FieldLabel>
                        <Select
                          id={`metric-parameter-derive-unit-${index}`}
                          className={selectClassName}
                          value={parameter.deriveFrom.shift.unit}
                          disabled={readOnly}
                          onChange={(event) =>
                            onChange(
                              updateParameterAtIndex(parameters, index, {
                                deriveFrom: {
                                  ...parameter.deriveFrom!,
                                  shift: {
                                    ...parameter.deriveFrom!.shift,
                                    unit: event.target.value as
                                      | "day"
                                      | "month"
                                      | "year",
                                  },
                                },
                              }),
                            )
                          }
                        >
                          {SHIFT_UNITS.map((unit) => (
                            <option key={unit} value={unit}>
                              {t(`metrics.dateGranularity.${unit}`, {
                                defaultValue: unit,
                              })}
                            </option>
                          ))}
                        </Select>
                      </div>

                      <div>
                        <FieldLabel
                          htmlFor={`metric-parameter-derive-offset-${index}`}
                        >
                          {t("metrics.computed.parameters.shiftOffset", {
                            defaultValue: "Shift offset",
                          })}
                        </FieldLabel>
                        <Input
                          id={`metric-parameter-derive-offset-${index}`}
                          type="number"
                          step={1}
                          value={String(parameter.deriveFrom.shift.offset)}
                          disabled={readOnly}
                          onChange={(event) => {
                            const parsed = Number(event.target.value);
                            if (!Number.isFinite(parsed)) {
                              return;
                            }
                            onChange(
                              updateParameterAtIndex(parameters, index, {
                                deriveFrom: {
                                  ...parameter.deriveFrom!,
                                  shift: {
                                    ...parameter.deriveFrom!.shift,
                                    offset: Math.trunc(parsed),
                                  },
                                },
                              }),
                            );
                          }}
                        />
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}

      {!readOnly ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddParameter}
        >
          {t("metrics.computed.parameters.add", {
            defaultValue: "Add parameter",
          })}
        </Button>
      ) : null}
    </div>
  );
}
