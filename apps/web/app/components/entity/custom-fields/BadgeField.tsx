import { Text } from "@repo/ui";

import type { FieldComponentProps } from "../field-component-registry";

export function BadgeField({ label, value }: FieldComponentProps) {
  return (
    <div className="flex flex-col gap-1">
      <Text className="text-muted-foreground text-xs">{label}</Text>
      <span className="bg-muted text-foreground inline-flex w-fit rounded-full px-2 py-1 text-xs">
        {typeof value === "string" && value.length > 0 ? value : "—"}
      </span>
    </div>
  );
}
