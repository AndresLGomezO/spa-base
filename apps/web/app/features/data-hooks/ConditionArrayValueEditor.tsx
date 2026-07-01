import { useTranslation } from "react-i18next";
import type { ExpressionLiteralValue, ExpressionNode } from "@repo/hooks";
import { MAX_ARRAY_LITERAL_ITEMS } from "@repo/hooks";
import { Button, FieldLabel, Input, Text } from "@repo/ui";

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
    <div className="space-y-2">
      <FieldLabel>{t("dataHooks.condition.arrayValue")}</FieldLabel>
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
      {items.length < MAX_ARRAY_LITERAL_ITEMS ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={handleAddItem}
        >
          {t("dataHooks.condition.addArrayItem")}
        </Button>
      ) : (
        <Text className="text-muted-foreground text-xs">
          {t("dataHooks.condition.arrayMaxItemsHint", {
            max: MAX_ARRAY_LITERAL_ITEMS,
          })}
        </Text>
      )}
    </div>
  );
}
