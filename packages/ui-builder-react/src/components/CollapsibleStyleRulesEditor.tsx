import { useState } from "react";
import type { StyleRule } from "@repo/ui-builder-core";
import { Button, IconButton, Popover } from "@repo/ui";

import { CollapsibleEditorCard } from "./CollapsibleEditorCard.js";
import type { StyleRulesEditorLabels } from "./StyleRulesEditor.js";
import {
  formatStylePropertyLabel,
  StyleRuleEditorFields,
} from "./StyleRuleEditorFields.js";
import {
  addStyleRule,
  removeStyleRule,
  upsertStyleRule,
} from "./style-rules-state.js";

const POPOVER_PANEL_CLASS = "w-72 min-w-[18rem]";

export interface CollapsibleStyleRulesEditorProps {
  readonly title: string;
  readonly styles?: readonly StyleRule[];
  readonly onChange: (styles: readonly StyleRule[]) => void;
  readonly labels: StyleRulesEditorLabels;
  readonly defaultOpen?: boolean;
}

function PlusIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

function formatValuePreview(rule: StyleRule): string {
  const raw = String(rule.value);
  if (raw.length > 48) {
    return `${raw.slice(0, 45)}...`;
  }
  return raw;
}

export function CollapsibleStyleRulesEditor({
  title,
  styles = [],
  onChange,
  labels,
  defaultOpen = false,
}: CollapsibleStyleRulesEditorProps) {
  const [cardOpen, setCardOpen] = useState(defaultOpen);
  const [addOpen, setAddOpen] = useState(false);
  const [addDraft, setAddDraft] = useState<StyleRule | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<StyleRule | null>(null);
  const saveLabel = labels.saveStyleRule ?? labels.addStyleRule;

  const handleAddOpenChange = (open: boolean) => {
    setAddOpen(open);
    if (open) {
      setCardOpen(true);
      setEditingIndex(null);
      setEditDraft(null);
      const next = addStyleRule(styles);
      const created = next[next.length - 1];
      setAddDraft(created ?? { property: "padding", value: "0" });
      return;
    }
    setAddDraft(null);
  };

  const confirmAdd = () => {
    if (!addDraft) {
      return;
    }
    const existingIndex = styles.findIndex(
      (rule) => rule.property === addDraft.property,
    );
    if (existingIndex >= 0) {
      onChange(upsertStyleRule(styles, existingIndex, addDraft));
    } else {
      onChange([...styles, addDraft]);
    }
    setAddOpen(false);
    setAddDraft(null);
  };

  const handleEditOpenChange = (index: number, open: boolean) => {
    if (open) {
      setCardOpen(true);
      setAddOpen(false);
      setAddDraft(null);
      setEditingIndex(index);
      setEditDraft({ ...styles[index]! });
      return;
    }
    setEditingIndex(null);
    setEditDraft(null);
  };

  const confirmEdit = (index: number) => {
    if (!editDraft) {
      return;
    }
    onChange(upsertStyleRule(styles, index, editDraft));
    setEditingIndex(null);
    setEditDraft(null);
  };

  const addTrigger = (
    <Popover
      open={addOpen}
      onOpenChange={handleAddOpenChange}
      layer="elevated"
      placement="right-start"
      title={labels.addStyleRule}
      panelClassName={POPOVER_PANEL_CLASS}
      trigger={
        <IconButton type="button" label={labels.addStyleRule} size="sm">
          <PlusIcon />
        </IconButton>
      }
    >
      {addDraft ? (
        <>
          <StyleRuleEditorFields
            rule={addDraft}
            labels={labels}
            onChange={(patch) => setAddDraft({ ...addDraft, ...patch })}
          />
          <div className="flex items-center justify-end gap-2">
            <IconButton
              type="button"
              label={labels.removeStyleRule}
              size="sm"
              onClick={() => setAddOpen(false)}
            >
              <TrashIcon />
            </IconButton>
            <Button type="button" size="sm" onClick={confirmAdd}>
              {labels.addStyleRule}
            </Button>
          </div>
        </>
      ) : null}
    </Popover>
  );

  return (
    <CollapsibleEditorCard
      title={title}
      open={cardOpen}
      onOpenChange={setCardOpen}
      addTrigger={addTrigger}
    >
      <div className="max-h-48 overflow-y-auto rounded-lg bg-background/60 shadow-inner">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 sticky top-0 backdrop-blur-sm">
            <tr>
              <th className="px-3 py-2 text-left font-medium">
                {labels.styleProperty}
              </th>
              <th className="px-3 py-2 text-left font-medium">
                {labels.styleValue}
              </th>
              <th className="px-3 py-2 text-right font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {styles.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="text-muted-foreground px-3 py-4 text-center"
                >
                  —
                </td>
              </tr>
            ) : (
              styles.map((rule, index) => (
                <tr
                  key={`${index}-${rule.property}`}
                  className="even:bg-muted/15 hover:bg-primary/5 transition-colors duration-150"
                >
                  <td className="px-3 py-2">
                    {formatStylePropertyLabel(rule.property)}
                  </td>
                  <td className="text-muted-foreground px-3 py-2">
                    {formatValuePreview(rule)}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <Popover
                        open={editingIndex === index}
                        onOpenChange={(open) =>
                          handleEditOpenChange(index, open)
                        }
                        layer="elevated"
                        placement="right-start"
                        title={saveLabel}
                        panelClassName={POPOVER_PANEL_CLASS}
                        trigger={
                          <IconButton type="button" label={saveLabel} size="sm">
                            <PencilIcon />
                          </IconButton>
                        }
                      >
                        {editDraft && editingIndex === index ? (
                          <>
                            <StyleRuleEditorFields
                              rule={editDraft}
                              labels={labels}
                              onChange={(patch) =>
                                setEditDraft({ ...editDraft, ...patch })
                              }
                            />
                            <div className="flex justify-end">
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => confirmEdit(index)}
                              >
                                {saveLabel}
                              </Button>
                            </div>
                          </>
                        ) : null}
                      </Popover>
                      <IconButton
                        type="button"
                        label={labels.removeStyleRule}
                        size="sm"
                        onClick={() => onChange(removeStyleRule(styles, index))}
                      >
                        <TrashIcon />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </CollapsibleEditorCard>
  );
}
