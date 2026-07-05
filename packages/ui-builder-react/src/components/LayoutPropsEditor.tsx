import { FieldLabel } from "@repo/ui";
import {
  filterLayoutStyleRules,
  filterVisualStyleRules,
  type StyleRule,
} from "@repo/ui-builder-core";

import {
  ResponsiveGridEditor,
  type ResponsiveGridEditorProps,
} from "./ResponsiveGridEditor.js";

export interface LayoutPropsEditorProps {
  readonly styles?: readonly StyleRule[];
  readonly columnCount: number;
  readonly labels: ResponsiveGridEditorProps["labels"];
  readonly onChange: (styles: readonly StyleRule[]) => void;
  readonly className?: string;
}

/**
 * Layout-only style editor (grid, gap, alignment). Visual rules stay in StyleRulesEditor.
 */
export function LayoutPropsEditor({
  styles,
  columnCount,
  labels,
  onChange,
  className,
}: LayoutPropsEditorProps) {
  const layoutStyles = filterLayoutStyleRules(styles ?? []);

  return (
    <ResponsiveGridEditor
      className={className}
      styles={layoutStyles}
      columnCount={columnCount}
      labels={labels}
      onChange={(nextLayoutStyles) => {
        const visual = filterVisualStyleRules(styles ?? []);
        onChange([...visual, ...nextLayoutStyles]);
      }}
    />
  );
}

export function LayoutPropsEditorSectionLabel({
  children,
}: {
  readonly children: string;
}) {
  return (
    <FieldLabel className="text-muted-foreground text-sm">
      {children}
    </FieldLabel>
  );
}
