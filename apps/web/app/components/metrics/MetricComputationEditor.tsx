import type {
  ComputedMetricComputation,
  ComputedMetricInputRef,
} from "@repo/metrics-engine/browser";
import { Button, FieldLabel, Input, Text } from "@repo/ui";
import { AdminSelect as Select } from "~/components/admin/AdminSelect";
import { useTranslation } from "react-i18next";

import type {
  EntityQueryDefinitionRecord,
  MetricDefinitionRecord,
} from "../../lib/api-client.js";
import { createDefaultComputedComputation } from "./metric-definition-draft.js";
import { MetricComputationInputRefEditor } from "./MetricComputationInputRefEditor.js";
import {
  createEmptyMetricRef,
  selectClassName,
} from "./metric-computation-shared.js";

interface MetricComputationEditorProps {
  readonly computation: ComputedMetricComputation;
  readonly onChange: (computation: ComputedMetricComputation) => void;
  readonly parameterNames: readonly string[];
  readonly metricDefinitions: readonly MetricDefinitionRecord[];
  readonly queryDefinitions: readonly EntityQueryDefinitionRecord[];
  readonly readOnly?: boolean;
}

type ComputationType = ComputedMetricComputation["type"];
type ExpressionToken = Extract<
  ComputedMetricComputation,
  { type: "expression" }
>["tokens"][number];
type ExpressionOperator = Extract<ExpressionToken, { type: "operator" }>["op"];

const COMPUTATION_TYPES: readonly ComputationType[] = [
  "percentChange",
  "difference",
  "ratio",
  "expression",
];

const OPERATOR_OPTIONS: readonly ExpressionOperator[] = ["+", "-", "*", "/"];

function createDefaultExpressionComputation(): Extract<
  ComputedMetricComputation,
  { type: "expression" }
> {
  return {
    type: "expression",
    inputs: {
      a: createEmptyMetricRef(),
    },
    tokens: [{ type: "input", name: "a" }],
  };
}

function switchComputationType(
  type: ComputationType,
): ComputedMetricComputation {
  switch (type) {
    case "percentChange":
    case "difference":
      return createDefaultComputedComputation();
    case "ratio":
      return {
        type: "ratio",
        numerator: createEmptyMetricRef(),
        denominator: createEmptyMetricRef(),
      };
    case "expression":
      return createDefaultExpressionComputation();
  }
}

function moveToken(
  tokens: readonly ExpressionToken[],
  index: number,
  direction: -1 | 1,
): ExpressionToken[] {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= tokens.length) {
    return [...tokens];
  }
  const next = [...tokens];
  const current = next[index]!;
  next[index] = next[targetIndex]!;
  next[targetIndex] = current;
  return next;
}

function updateTokenAtIndex(
  tokens: readonly ExpressionToken[],
  index: number,
  token: ExpressionToken,
): ExpressionToken[] {
  return tokens.map((item, itemIndex) => (itemIndex === index ? token : item));
}

function removeTokenAtIndex(
  tokens: readonly ExpressionToken[],
  index: number,
): ExpressionToken[] {
  return tokens.filter((_, itemIndex) => itemIndex !== index);
}

function appendExpressionInput(
  computation: Extract<ComputedMetricComputation, { type: "expression" }>,
): Extract<ComputedMetricComputation, { type: "expression" }> {
  let index = Object.keys(computation.inputs).length + 1;
  let name = `input${String(index)}`;
  while (name in computation.inputs) {
    index += 1;
    name = `input${String(index)}`;
  }
  return {
    ...computation,
    inputs: {
      ...computation.inputs,
      [name]: createEmptyMetricRef(),
    },
  };
}

function renameExpressionInput(
  computation: Extract<ComputedMetricComputation, { type: "expression" }>,
  oldName: string,
  newName: string,
): Extract<ComputedMetricComputation, { type: "expression" }> {
  const trimmed = newName.trim();
  if (trimmed.length === 0 || trimmed === oldName) {
    return computation;
  }

  const nextInputs: Record<string, ComputedMetricInputRef> = {};
  for (const [key, inputRef] of Object.entries(computation.inputs)) {
    nextInputs[key === oldName ? trimmed : key] = inputRef;
  }

  const nextTokens = computation.tokens.map((token) =>
    token.type === "input" && token.name === oldName
      ? { ...token, name: trimmed }
      : token,
  );

  return {
    ...computation,
    inputs: nextInputs,
    tokens: nextTokens,
  };
}

function removeExpressionInput(
  computation: Extract<ComputedMetricComputation, { type: "expression" }>,
  name: string,
): Extract<ComputedMetricComputation, { type: "expression" }> {
  const nextInputs = { ...computation.inputs };
  delete nextInputs[name];
  return {
    ...computation,
    inputs: nextInputs,
    tokens: computation.tokens.filter(
      (token) => token.type !== "input" || token.name !== name,
    ),
  };
}

function InputRefSection({
  title,
  value,
  onChange,
  parameterNames,
  metricDefinitions,
  queryDefinitions,
  readOnly,
}: {
  readonly title: string;
  readonly value: ComputedMetricInputRef;
  readonly onChange: (value: ComputedMetricInputRef) => void;
  readonly parameterNames: readonly string[];
  readonly metricDefinitions: readonly MetricDefinitionRecord[];
  readonly queryDefinitions: readonly EntityQueryDefinitionRecord[];
  readonly readOnly?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Text className="text-muted-foreground text-xs font-medium">{title}</Text>
      <MetricComputationInputRefEditor
        value={value}
        onChange={onChange}
        parameterNames={parameterNames}
        metricDefinitions={metricDefinitions}
        queryDefinitions={queryDefinitions}
        readOnly={readOnly}
      />
    </div>
  );
}

export function MetricComputationEditor({
  computation,
  onChange,
  parameterNames,
  metricDefinitions,
  queryDefinitions,
  readOnly = false,
}: MetricComputationEditorProps) {
  const { t } = useTranslation("common");
  const inputNames =
    computation.type === "expression" ? Object.keys(computation.inputs) : [];

  return (
    <div className="space-y-4">
      <div>
        <FieldLabel htmlFor="metric-computation-type">
          {t("metrics.computed.computation.type", {
            defaultValue: "Computation type",
          })}
        </FieldLabel>
        <Select
          id="metric-computation-type"
          className={selectClassName}
          value={computation.type}
          disabled={readOnly}
          onChange={(event) =>
            onChange(
              switchComputationType(event.target.value as ComputationType),
            )
          }
        >
          {COMPUTATION_TYPES.map((type) => (
            <option key={type} value={type}>
              {t(`metrics.computed.computation.types.${type}`, {
                defaultValue: type,
              })}
            </option>
          ))}
        </Select>
      </div>

      {computation.type === "percentChange" ||
      computation.type === "difference" ? (
        <>
          <InputRefSection
            title={t("metrics.computed.computation.current", {
              defaultValue: "Current",
            })}
            value={computation.current}
            onChange={(current) => onChange({ ...computation, current })}
            parameterNames={parameterNames}
            metricDefinitions={metricDefinitions}
            queryDefinitions={queryDefinitions}
            readOnly={readOnly}
          />
          <InputRefSection
            title={t("metrics.computed.computation.baseline", {
              defaultValue: "Baseline",
            })}
            value={computation.baseline}
            onChange={(baseline) => onChange({ ...computation, baseline })}
            parameterNames={parameterNames}
            metricDefinitions={metricDefinitions}
            queryDefinitions={queryDefinitions}
            readOnly={readOnly}
          />
        </>
      ) : null}

      {computation.type === "ratio" ? (
        <>
          <InputRefSection
            title={t("metrics.computed.computation.numerator", {
              defaultValue: "Numerator",
            })}
            value={computation.numerator}
            onChange={(numerator) => onChange({ ...computation, numerator })}
            parameterNames={parameterNames}
            metricDefinitions={metricDefinitions}
            queryDefinitions={queryDefinitions}
            readOnly={readOnly}
          />
          <InputRefSection
            title={t("metrics.computed.computation.denominator", {
              defaultValue: "Denominator",
            })}
            value={computation.denominator}
            onChange={(denominator) =>
              onChange({ ...computation, denominator })
            }
            parameterNames={parameterNames}
            metricDefinitions={metricDefinitions}
            queryDefinitions={queryDefinitions}
            readOnly={readOnly}
          />
        </>
      ) : null}

      {computation.type === "expression" ? (
        <>
          <div className="space-y-3">
            <Text className="text-muted-foreground text-xs font-medium">
              {t("metrics.computed.computation.expressionInputs", {
                defaultValue: "Expression inputs",
              })}
            </Text>

            {inputNames.length === 0 ? (
              <Text className="text-muted-foreground text-sm">
                {t("metrics.computed.computation.noInputs", {
                  defaultValue: "Add at least one named input.",
                })}
              </Text>
            ) : null}

            {inputNames.map((inputName) => (
              <div
                key={inputName}
                className="border-border space-y-3 rounded-md border p-3"
              >
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                  <Input
                    value={inputName}
                    disabled={readOnly}
                    placeholder={t("metrics.computed.computation.inputName", {
                      defaultValue: "input name",
                    })}
                    onChange={(event) =>
                      onChange(
                        renameExpressionInput(
                          computation,
                          inputName,
                          event.target.value,
                        ),
                      )
                    }
                  />
                  {!readOnly ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        onChange(removeExpressionInput(computation, inputName))
                      }
                    >
                      {t("metrics.computed.computation.removeInput", {
                        defaultValue: "Remove input",
                      })}
                    </Button>
                  ) : null}
                </div>

                <MetricComputationInputRefEditor
                  value={
                    computation.inputs[inputName] ?? createEmptyMetricRef()
                  }
                  onChange={(inputRef) =>
                    onChange({
                      ...computation,
                      inputs: {
                        ...computation.inputs,
                        [inputName]: inputRef,
                      },
                    })
                  }
                  parameterNames={parameterNames}
                  metricDefinitions={metricDefinitions}
                  queryDefinitions={queryDefinitions}
                  readOnly={readOnly}
                />
              </div>
            ))}

            {!readOnly ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onChange(appendExpressionInput(computation))}
              >
                {t("metrics.computed.computation.addInput", {
                  defaultValue: "Add input",
                })}
              </Button>
            ) : null}
          </div>

          <div className="space-y-2">
            <Text className="text-muted-foreground text-xs font-medium">
              {t("metrics.computed.computation.expressionTokens", {
                defaultValue: "Expression tokens",
              })}
            </Text>

            {computation.tokens.map((token, index) => (
              <div
                key={`expression-token-${index}`}
                className="border-border space-y-2 rounded-md border p-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <Text className="text-muted-foreground text-xs">
                    {t("metrics.derivedKpi.tokenLabel", {
                      index: index + 1,
                      defaultValue: "Token {{index}}",
                    })}
                  </Text>
                  {!readOnly ? (
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={index === 0}
                        onClick={() =>
                          onChange({
                            ...computation,
                            tokens: moveToken(computation.tokens, index, -1),
                          })
                        }
                      >
                        {t("metrics.derivedKpi.moveTokenUp", {
                          defaultValue: "Up",
                        })}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={index === computation.tokens.length - 1}
                        onClick={() =>
                          onChange({
                            ...computation,
                            tokens: moveToken(computation.tokens, index, 1),
                          })
                        }
                      >
                        {t("metrics.derivedKpi.moveTokenDown", {
                          defaultValue: "Down",
                        })}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          onChange({
                            ...computation,
                            tokens: removeTokenAtIndex(
                              computation.tokens,
                              index,
                            ),
                          })
                        }
                      >
                        {t("metrics.derivedKpi.removeToken", {
                          defaultValue: "Remove",
                        })}
                      </Button>
                    </div>
                  ) : null}
                </div>

                <label className="flex flex-col gap-1">
                  <span className="text-muted-foreground text-xs">
                    {t("metrics.derivedKpi.tokenType", {
                      defaultValue: "Token type",
                    })}
                  </span>
                  <Select
                    className={selectClassName}
                    value={token.type}
                    disabled={readOnly}
                    onChange={(event) => {
                      const nextType = event.target
                        .value as ExpressionToken["type"];
                      if (nextType === "input") {
                        onChange({
                          ...computation,
                          tokens: updateTokenAtIndex(
                            computation.tokens,
                            index,
                            {
                              type: "input",
                              name: inputNames[0] ?? "a",
                            },
                          ),
                        });
                        return;
                      }
                      if (nextType === "operator") {
                        onChange({
                          ...computation,
                          tokens: updateTokenAtIndex(
                            computation.tokens,
                            index,
                            {
                              type: "operator",
                              op: "+",
                            },
                          ),
                        });
                        return;
                      }
                      onChange({
                        ...computation,
                        tokens: updateTokenAtIndex(computation.tokens, index, {
                          type: "literal",
                          value: 1,
                        }),
                      });
                    }}
                  >
                    <option value="input">
                      {t("metrics.computed.computation.tokenTypes.input", {
                        defaultValue: "Input",
                      })}
                    </option>
                    <option value="operator">
                      {t("metrics.derivedKpi.tokenTypes.operator", {
                        defaultValue: "Operator",
                      })}
                    </option>
                    <option value="literal">
                      {t("metrics.computed.computation.tokenTypes.literal", {
                        defaultValue: "Literal",
                      })}
                    </option>
                  </Select>
                </label>

                {token.type === "input" ? (
                  <label className="flex flex-col gap-1">
                    <span className="text-muted-foreground text-xs">
                      {t("metrics.computed.computation.inputName", {
                        defaultValue: "Input name",
                      })}
                    </span>
                    <Select
                      className={selectClassName}
                      value={token.name}
                      disabled={readOnly}
                      onChange={(event) =>
                        onChange({
                          ...computation,
                          tokens: updateTokenAtIndex(
                            computation.tokens,
                            index,
                            {
                              ...token,
                              name: event.target.value,
                            },
                          ),
                        })
                      }
                    >
                      {inputNames.length === 0 ? (
                        <option value="">
                          {t("metrics.computed.computation.noInputs", {
                            defaultValue: "Add an input first",
                          })}
                        </option>
                      ) : null}
                      {inputNames.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </Select>
                  </label>
                ) : null}

                {token.type === "operator" ? (
                  <label className="flex flex-col gap-1">
                    <span className="text-muted-foreground text-xs">
                      {t("metrics.derivedKpi.operator", {
                        defaultValue: "Operator",
                      })}
                    </span>
                    <Select
                      className={selectClassName}
                      value={token.op}
                      disabled={readOnly}
                      onChange={(event) =>
                        onChange({
                          ...computation,
                          tokens: updateTokenAtIndex(
                            computation.tokens,
                            index,
                            {
                              ...token,
                              op: event.target.value as ExpressionOperator,
                            },
                          ),
                        })
                      }
                    >
                      {OPERATOR_OPTIONS.map((operator) => (
                        <option key={operator} value={operator}>
                          {t(`metrics.derivedKpi.operators.${operator}`, {
                            defaultValue: operator,
                          })}
                        </option>
                      ))}
                    </Select>
                  </label>
                ) : null}

                {token.type === "literal" ? (
                  <label className="flex flex-col gap-1">
                    <span className="text-muted-foreground text-xs">
                      {t("metrics.derivedKpi.constantValue", {
                        defaultValue: "Value",
                      })}
                    </span>
                    <Input
                      type="number"
                      step="any"
                      value={String(token.value)}
                      disabled={readOnly}
                      onChange={(event) => {
                        const parsed = Number(event.target.value);
                        if (!Number.isFinite(parsed)) {
                          return;
                        }
                        onChange({
                          ...computation,
                          tokens: updateTokenAtIndex(
                            computation.tokens,
                            index,
                            {
                              ...token,
                              value: parsed,
                            },
                          ),
                        });
                      }}
                    />
                  </label>
                ) : null}
              </div>
            ))}

            {!readOnly ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={inputNames.length === 0}
                  onClick={() =>
                    onChange({
                      ...computation,
                      tokens: [
                        ...computation.tokens,
                        { type: "input", name: inputNames[0] ?? "a" },
                      ],
                    })
                  }
                >
                  {t("metrics.computed.computation.insertInput", {
                    defaultValue: "Insert input",
                  })}
                </Button>
                {OPERATOR_OPTIONS.map((operator) => (
                  <Button
                    key={operator}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      onChange({
                        ...computation,
                        tokens: [
                          ...computation.tokens,
                          { type: "operator", op: operator },
                        ],
                      })
                    }
                  >
                    {t(`metrics.derivedKpi.insertOperator.${operator}`, {
                      defaultValue: operator,
                    })}
                  </Button>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    onChange({
                      ...computation,
                      tokens: [
                        ...computation.tokens,
                        { type: "literal", value: 1 },
                      ],
                    })
                  }
                >
                  {t("metrics.computed.computation.insertLiteral", {
                    defaultValue: "Insert literal",
                  })}
                </Button>
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
