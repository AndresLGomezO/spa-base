import type { ReactElement } from "react";
import { FieldLabel, SegmentedSwitch } from "@repo/ui";
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
    <div className={className ?? "flex flex-col gap-1 text-sm"}>
      <FieldLabel className="text-muted-foreground font-normal">
        {labels.title}
      </FieldLabel>
      <SegmentedSwitch
        value={value}
        options={[
          {
            value: "column",
            label: labels.vertical,
            ariaLabel: labels.vertical,
          },
          {
            value: "row",
            label: labels.horizontal,
            ariaLabel: labels.horizontal,
          },
        ]}
        onChange={onChange}
        ariaLabel={labels.title}
      />
    </div>
  );
}
