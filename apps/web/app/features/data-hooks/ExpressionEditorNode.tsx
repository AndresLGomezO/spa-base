import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FieldLabel, Input, Select, Text } from "@repo/ui";
import type { ExpressionNode } from "@repo/hooks";

import { BinaryExpressionPanel } from "./BinaryExpressionPanel";
import { CallExpressionPanel } from "./CallExpressionPanel";
import { UnaryExpressionPanel } from "./UnaryExpressionPanel";
import {
  createDefaultNode,
  resolveEditorKind,
  type EditorKind,
} from "./expression-editor-utils";
import {
  expressionControlClassName,
  expressionTextareaClassName,
} from "./expression-editor-shared";
import type {
  ExpressionEditorNodeProps,
  ExpressionEditorNodeRenderer,
} from "./expression-editor-node-types";

export function ExpressionEditorNode({
  value,
  onChange,
  fieldNames,
  label,
}: ExpressionEditorNodeProps) {
  const { t } = useTranslation("common");
  const resolvedKind = resolveEditorKind(value);
  const [forceAdvanced, setForceAdvanced] = useState(
    () => resolvedKind === "advanced",
  );
  const kind: EditorKind = forceAdvanced ? "advanced" : resolvedKind;
  const [advancedText, setAdvancedText] = useState(() =>
    JSON.stringify(value, null, 2),
  );
  const [advancedError, setAdvancedError] = useState<string | null>(null);

  const renderNestedNode: ExpressionEditorNodeRenderer = (nestedProps) => (
    <ExpressionEditorNode {...nestedProps} />
  );

  const literalValue = value.kind === "literal" ? value.value : null;
  const literalType = useMemo<"text" | "number" | "boolean">(() => {
    if (typeof literalValue === "number") return "number";
    if (typeof literalValue === "boolean") return "boolean";
    return "text";
  }, [literalValue]);

  function handleKindChange(next: EditorKind) {
    if (next === "advanced") {
      setForceAdvanced(true);
      setAdvancedText(JSON.stringify(value, null, 2));
      return;
    }
    setForceAdvanced(false);
    onChange(createDefaultNode(next, fieldNames));
  }

  function handleAdvancedChange(text: string) {
    setAdvancedText(text);
    try {
      const parsed = JSON.parse(text) as ExpressionNode;
      setAdvancedError(null);
      setForceAdvanced(resolveEditorKind(parsed) === "advanced");
      onChange(parsed);
    } catch {
      setAdvancedError(t("dataHooks.expression.invalidJson"));
    }
  }

  return (
    <div className="space-y-2">
      {label ? <FieldLabel>{label}</FieldLabel> : null}
      <Select
        className={expressionControlClassName}
        value={kind}
        onChange={(event) => handleKindChange(event.target.value as EditorKind)}
      >
        <option value="literal">{t("dataHooks.expression.literal")}</option>
        <option value="field">{t("dataHooks.expression.field")}</option>
        <option value="now">{t("dataHooks.expression.now")}</option>
        <option value="loopIndex">{t("dataHooks.expression.loopIndex")}</option>
        <option value="binary">{t("dataHooks.expression.binary")}</option>
        <option value="unary">{t("dataHooks.expression.unary")}</option>
        <option value="call">{t("dataHooks.expression.call")}</option>
        <option value="advanced">{t("dataHooks.expression.advanced")}</option>
      </Select>

      {kind === "literal" ? (
        <div className="flex gap-2">
          <Select
            className={`${expressionControlClassName} w-32`}
            value={literalType}
            onChange={(event) => {
              const nextType = event.target.value as
                | "text"
                | "number"
                | "boolean";
              if (nextType === "number") {
                onChange({ kind: "literal", value: 0 });
              } else if (nextType === "boolean") {
                onChange({ kind: "literal", value: true });
              } else {
                onChange({ kind: "literal", value: "" });
              }
            }}
          >
            <option value="text">{t("dataHooks.expression.text")}</option>
            <option value="number">{t("dataHooks.expression.number")}</option>
            <option value="boolean">{t("dataHooks.expression.boolean")}</option>
          </Select>
          {literalType === "boolean" ? (
            <Select
              className={expressionControlClassName}
              value={literalValue === true ? "true" : "false"}
              onChange={(event) =>
                onChange({
                  kind: "literal",
                  value: event.target.value === "true",
                })
              }
            >
              <option value="true">true</option>
              <option value="false">false</option>
            </Select>
          ) : (
            <Input
              type={literalType === "number" ? "number" : "text"}
              value={literalValue == null ? "" : String(literalValue)}
              onChange={(event) =>
                onChange({
                  kind: "literal",
                  value:
                    literalType === "number"
                      ? Number(event.target.value)
                      : event.target.value,
                })
              }
            />
          )}
        </div>
      ) : null}

      {kind === "field" && value.kind === "field" ? (
        <div className="flex gap-2">
          <Select
            className={`${expressionControlClassName} w-36`}
            value={value.source}
            onChange={(event) =>
              onChange({
                kind: "field",
                source: event.target.value as "current" | "previous",
                path: value.path,
              })
            }
          >
            <option value="current">{t("dataHooks.expression.current")}</option>
            <option value="previous">
              {t("dataHooks.expression.previous")}
            </option>
          </Select>
          {fieldNames && fieldNames.length > 0 ? (
            <Select
              className={expressionControlClassName}
              value={value.path}
              onChange={(event) =>
                onChange({
                  kind: "field",
                  source: value.source,
                  path: event.target.value,
                })
              }
            >
              {!fieldNames.includes(value.path) ? (
                <option value={value.path}>{value.path || "—"}</option>
              ) : null}
              {fieldNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
          ) : (
            <Input
              value={value.path}
              placeholder={t("dataHooks.expression.fieldPathPlaceholder")}
              onChange={(event) =>
                onChange({
                  kind: "field",
                  source: value.source,
                  path: event.target.value,
                })
              }
            />
          )}
        </div>
      ) : null}

      {kind === "binary" && value.kind === "binary" ? (
        <BinaryExpressionPanel
          value={value}
          onChange={onChange}
          fieldNames={fieldNames}
          renderNode={renderNestedNode}
        />
      ) : null}

      {kind === "unary" && value.kind === "unary" ? (
        <UnaryExpressionPanel
          value={value}
          onChange={onChange}
          fieldNames={fieldNames}
          renderNode={renderNestedNode}
        />
      ) : null}

      {kind === "call" && value.kind === "call" ? (
        <CallExpressionPanel
          value={value}
          onChange={onChange}
          fieldNames={fieldNames}
          renderNode={renderNestedNode}
        />
      ) : null}

      {kind === "advanced" ? (
        <div className="space-y-1">
          <textarea
            className={expressionTextareaClassName}
            value={advancedText}
            onChange={(event) => handleAdvancedChange(event.target.value)}
            spellCheck={false}
          />
          {advancedError ? (
            <Text className="text-destructive text-xs">{advancedError}</Text>
          ) : (
            <Text className="text-muted-foreground text-xs">
              {t("dataHooks.expression.advancedHint")}
            </Text>
          )}
        </div>
      ) : null}
    </div>
  );
}
