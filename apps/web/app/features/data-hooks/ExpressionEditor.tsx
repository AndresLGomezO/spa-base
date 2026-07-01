import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FieldLabel, Input, Select, Text } from "@repo/ui";
import type { ExpressionNode } from "@repo/hooks";

const controlClassName =
  "border-input bg-background flex h-9 w-full rounded-md border px-3 py-1.5 text-sm";
const textareaClassName =
  "border-input bg-background flex min-h-[80px] w-full rounded-md border px-3 py-2 font-mono text-xs";

type SimpleKind = "literal" | "field" | "now" | "loopIndex" | "advanced";

function resolveKind(node: ExpressionNode): SimpleKind {
  if (node.kind === "literal") return "literal";
  if (node.kind === "field") return "field";
  if (node.kind === "var") {
    return node.name === "loopIndex" ? "loopIndex" : "now";
  }
  return "advanced";
}

interface ExpressionEditorProps {
  readonly value: ExpressionNode;
  readonly onChange: (node: ExpressionNode) => void;
  readonly fieldNames?: readonly string[];
  readonly label?: string;
}

export function ExpressionEditor({
  value,
  onChange,
  fieldNames,
  label,
}: ExpressionEditorProps) {
  const { t } = useTranslation("common");
  const kind = resolveKind(value);
  const [advancedText, setAdvancedText] = useState(() =>
    JSON.stringify(value, null, 2),
  );
  const [advancedError, setAdvancedError] = useState<string | null>(null);

  const literalValue = value.kind === "literal" ? value.value : null;
  const literalType = useMemo<"text" | "number" | "boolean">(() => {
    if (typeof literalValue === "number") return "number";
    if (typeof literalValue === "boolean") return "boolean";
    return "text";
  }, [literalValue]);

  function handleKindChange(next: SimpleKind) {
    switch (next) {
      case "literal":
        onChange({ kind: "literal", value: "" });
        return;
      case "field":
        onChange({
          kind: "field",
          source: "current",
          path: fieldNames?.[0] ?? "",
        });
        return;
      case "now":
        onChange({ kind: "var", name: "now" });
        return;
      case "loopIndex":
        onChange({ kind: "var", name: "loopIndex" });
        return;
      case "advanced":
        setAdvancedText(JSON.stringify(value, null, 2));
        return;
    }
  }

  function handleAdvancedChange(text: string) {
    setAdvancedText(text);
    try {
      const parsed = JSON.parse(text) as ExpressionNode;
      setAdvancedError(null);
      onChange(parsed);
    } catch {
      setAdvancedError(t("dataHooks.expression.invalidJson"));
    }
  }

  return (
    <div className="space-y-2">
      {label ? <FieldLabel>{label}</FieldLabel> : null}
      <Select
        className={controlClassName}
        value={kind}
        onChange={(event) => handleKindChange(event.target.value as SimpleKind)}
      >
        <option value="literal">{t("dataHooks.expression.literal")}</option>
        <option value="field">{t("dataHooks.expression.field")}</option>
        <option value="now">{t("dataHooks.expression.now")}</option>
        <option value="loopIndex">{t("dataHooks.expression.loopIndex")}</option>
        <option value="advanced">{t("dataHooks.expression.advanced")}</option>
      </Select>

      {kind === "literal" ? (
        <div className="flex gap-2">
          <Select
            className={`${controlClassName} w-32`}
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
              className={controlClassName}
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
            className={`${controlClassName} w-36`}
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
              className={controlClassName}
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

      {kind === "advanced" ? (
        <div className="space-y-1">
          <textarea
            className={textareaClassName}
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
