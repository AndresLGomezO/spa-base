import { Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

interface HookPreviewLoopExampleProps {
  readonly fields: readonly {
    readonly label: string;
    readonly value: string;
  }[];
}

const EXAMPLE_PAYMENTS = [1, 2, 3] as const;

export function HookPreviewLoopExample({
  fields,
}: HookPreviewLoopExampleProps) {
  const { t } = useTranslation("common");

  return (
    <div className="space-y-2">
      <Text className="text-foreground text-xs font-medium">
        {t("dataHooks.preview.loop.title")}
      </Text>
      <ul className="space-y-2">
        {EXAMPLE_PAYMENTS.map((index) => (
          <li
            key={index}
            className="bg-muted/40 border-border rounded-md border px-3 py-2 text-xs"
          >
            <Text className="text-foreground font-medium">
              {t("dataHooks.preview.loop.payment", { number: index })}
            </Text>
            <ul className="text-muted-foreground mt-1 space-y-0.5">
              {fields.map((field) => (
                <li key={field.label}>
                  {field.label}: {field.value}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
