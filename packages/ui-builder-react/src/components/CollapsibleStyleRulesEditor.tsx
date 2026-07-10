import { useState } from "react";

import { CollapsibleEditorCard } from "./CollapsibleEditorCard.js";
import type { StyleRulesEditorLabels } from "./StyleRulesEditor.js";
import { useStyleRulesPopoverEditor } from "./StyleRulesPopoverTable.js";

export interface CollapsibleStyleRulesEditorProps {
  readonly title: string;
  readonly styles?: readonly import("@repo/ui-builder-core").StyleRule[];
  readonly onChange: (
    styles: readonly import("@repo/ui-builder-core").StyleRule[],
  ) => void;
  readonly labels: StyleRulesEditorLabels;
  readonly defaultOpen?: boolean;
}

export function CollapsibleStyleRulesEditor({
  title,
  styles = [],
  onChange,
  labels,
  defaultOpen = false,
}: CollapsibleStyleRulesEditorProps) {
  const [cardOpen, setCardOpen] = useState(defaultOpen);
  const { addTrigger, table } = useStyleRulesPopoverEditor({
    styles,
    onChange,
    labels,
    onInteraction: () => setCardOpen(true),
  });

  return (
    <CollapsibleEditorCard
      title={title}
      open={cardOpen}
      onOpenChange={setCardOpen}
      addTrigger={addTrigger}
    >
      {table}
    </CollapsibleEditorCard>
  );
}
