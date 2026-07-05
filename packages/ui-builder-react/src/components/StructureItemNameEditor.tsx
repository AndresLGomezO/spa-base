import type { ReactElement } from "react";
import { FieldLabel, Text } from "@repo/ui";

import { PreservedTextInput } from "./PreservedTextInput.js";

export interface StructureItemNameEditorLabels {
  readonly label: string;
  readonly placeholder: string;
  readonly hint: string;
}

export interface StructureItemNameEditorProps {
  readonly name?: string;
  readonly defaultName: string;
  readonly onChange: (name: string | undefined) => void;
  readonly labels: StructureItemNameEditorLabels;
  readonly id?: string;
  readonly className?: string;
}

function normalizeStructureItemName(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export { normalizeStructureItemName };

export function StructureItemNameEditor({
  name,
  onChange,
  labels,
  id,
  className,
}: StructureItemNameEditorProps): ReactElement {
  return (
    <div
      className={
        className ?? "flex min-w-[12rem] flex-1 flex-col gap-1 text-sm"
      }
    >
      <FieldLabel htmlFor={id}>{labels.label}</FieldLabel>
      <PreservedTextInput
        id={id}
        value={name ?? ""}
        placeholder={labels.placeholder}
        onChange={(nextValue) => {
          onChange(normalizeStructureItemName(nextValue));
        }}
      />
      <Text className="text-muted-foreground text-xs">{labels.hint}</Text>
    </div>
  );
}
