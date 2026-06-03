import type { ReactElement } from "react";
import type { ColumnStackDirection } from "@repo/ui-builder-core";

export interface ColumnStackDirectionEditorLabels {
  readonly title: string;
  readonly vertical: string;
  readonly horizontal: string;
}

export interface ColumnStackDirectionEditorProps {
  readonly stackDirection: ColumnStackDirection | undefined;
  readonly onChange: (stackDirection: ColumnStackDirection) => void;
  readonly labels: ColumnStackDirectionEditorLabels;
  readonly className?: string;
}

export function ColumnStackDirectionEditor({
  stackDirection,
  onChange,
  labels,
  className,
}: ColumnStackDirectionEditorProps): ReactElement {
  const value = stackDirection ?? "column";

  return (
    <label className={className ?? "flex flex-col gap-1 text-sm"}>
      <span>{labels.title}</span>
      <select
        className="border-input bg-background rounded-md border px-2 py-1"
        value={value}
        onChange={(event) =>
          onChange(event.target.value as ColumnStackDirection)
        }
      >
        <option value="column">{labels.vertical}</option>
        <option value="row">{labels.horizontal}</option>
      </select>
    </label>
  );
}
