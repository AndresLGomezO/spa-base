import { useTranslation } from "react-i18next";
import type { ExpressionLiteralValue, ExpressionNode } from "@repo/hooks";
import { MAX_ARRAY_LITERAL_ITEMS } from "@repo/hooks";
import { CollapsibleEditorCard } from "@repo/ui-builder-react";
import { Button, Input, Text } from "@repo/ui";

const controlClassName =
  "border-input bg-background flex h-9 w-full rounded-md border px-3 py-1.5 text-sm";

function toArrayValue(value: ExpressionLiteralValue): string[] {
  if (!Array.isArray(value)) {
    return [""];
  }
  return value.map((entry) => (entry == null ? "" : String(entry)));
}

interface ConditionArrayValueEditorProps {
  readonly value: Extract<ExpressionNode, { kind: "literal" }>;
  readonly disabled?: boolean;
  readonly onChange: (node: ExpressionNode) => void;
}

export function ConditionArrayValueEditor({
  value,
  disabled = false,
  onChange,
}: ConditionArrayValueEditorProps) {
  const { t } = useTranslation("common");
  const items = toArrayValue(value.value);

  function emit(nextItems: string[]) {
    onChange({
      kind: "literal",
      value: nextItems,
    });
  }

  function handleItemChange(index: number, nextValue: string) {
    const nextItems = [...items];
    nextItems[index] = nextValue;
    emit(nextItems);
  }

  function handleAddItem() {
    if (items.length >= MAX_ARRAY_LITERAL_ITEMS) {
      return;
    }
    emit([...items, ""]);
  }

  function handleRemoveItem(index: number) {
    if (items.length <= 1) {
      return;
    }
    emit(items.filter((_, itemIndex) => itemIndex !== index));
  }

  return (
    <CollapsibleEditorCard
      title={t("dataHooks.condition.arrayValue")}
      defaultOpen={items.some((item) => item.trim().length > 0)}
      className="bg-muted/20 shadow-sm"
      onAdd={
        disabled || items.length >= MAX_ARRAY_LITERAL_ITEMS
          ? undefined
          : handleAddItem
      }
      addLabel={t("dataHooks.condition.addArrayItem")}
    >
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              className={controlClassName}
              value={item}
              disabled={disabled}
              placeholder={t("dataHooks.condition.arrayItemPlaceholder")}
              onChange={(event) => handleItemChange(index, event.target.value)}
            />
            {items.length > 1 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() => handleRemoveItem(index)}
              >
                {t("dataHooks.condition.removeArrayItem")}
              </Button>
            ) : null}
          </div>
        ))}
      </div>
      {items.length >= MAX_ARRAY_LITERAL_ITEMS ? (
        <Text className="text-muted-foreground text-xs">
          {t("dataHooks.condition.arrayMaxItemsHint", {
            max: MAX_ARRAY_LITERAL_ITEMS,
          })}
        </Text>
      ) : null}
    </CollapsibleEditorCard>
  );
}
