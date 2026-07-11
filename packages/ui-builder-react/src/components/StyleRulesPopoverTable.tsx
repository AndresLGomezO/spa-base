import { useState, type ReactNode } from "react";
import type { StyleRule } from "@repo/ui-builder-core";
import { Button, IconButton, Popover } from "@repo/ui";

import type { StyleRulesEditorLabels } from "./StyleRulesEditor.js";
import {
  formatStylePropertyLabel,
  StyleRuleEditorFields,
} from "./StyleRuleEditorFields.js";
import {
  addStyleRule,
  defaultValueForProperty,
  formatStyleRuleValuePreview,
  removeStyleRule,
  upsertStyleRule,
} from "./style-rules-state.js";

/** Wide editor panel so style + screen-override forms have room. */
export const STYLE_RULES_POPOVER_PANEL_CLASS =
  "w-[min(36rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)]";

function mergeStyleRulePatch(
  current: StyleRule,
  patch: Partial<StyleRule>,
): StyleRule {
  if (patch.property && patch.property !== current.property) {
    return {
      property: patch.property,
      value:
        patch.value !== undefined
          ? patch.value
          : defaultValueForProperty(patch.property),
      ...(patch.valuesByBreakpoint !== undefined
        ? { valuesByBreakpoint: patch.valuesByBreakpoint }
        : {}),
    };
  }

  const merged: StyleRule = {
    ...current,
    ...patch,
  };

  return {
    property: merged.property,
    ...(merged.value !== undefined ? { value: merged.value } : {}),
    ...(Object.prototype.hasOwnProperty.call(patch, "valuesByBreakpoint")
      ? merged.valuesByBreakpoint !== undefined
        ? { valuesByBreakpoint: merged.valuesByBreakpoint }
        : {}
      : merged.valuesByBreakpoint !== undefined
        ? { valuesByBreakpoint: merged.valuesByBreakpoint }
        : {}),
  };
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

export interface UseStyleRulesPopoverEditorOptions {
  readonly styles?: readonly StyleRule[];
  readonly onChange: (styles: readonly StyleRule[]) => void;
  readonly labels: StyleRulesEditorLabels;
  readonly onInteraction?: () => void;
}

export function useStyleRulesPopoverEditor({
  styles = [],
  onChange,
  labels,
  onInteraction,
}: UseStyleRulesPopoverEditorOptions) {
  const [addOpen, setAddOpen] = useState(false);
  const [addDraft, setAddDraft] = useState<StyleRule | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<StyleRule | null>(null);
  const [addSubViewActive, setAddSubViewActive] = useState(false);
  const [editSubViewActive, setEditSubViewActive] = useState(false);
  const saveLabel = labels.saveStyleRule ?? labels.addStyleRule;
  const cancelLabel = labels.styleBreakpointCancel ?? "Cancel";

  const handleAddOpenChange = (open: boolean) => {
    setAddOpen(open);
    if (open) {
      onInteraction?.();
      setEditingIndex(null);
      setEditDraft(null);
      setEditSubViewActive(false);
      setAddSubViewActive(false);
      const next = addStyleRule(styles);
      const created = next[next.length - 1];
      setAddDraft(created ?? { property: "padding", value: "0" });
      return;
    }
    setAddDraft(null);
    setAddSubViewActive(false);
  };

  const confirmAdd = () => {
    if (!addDraft) {
      return;
    }
    const existingIndex = styles.findIndex(
      (rule) => rule.property === addDraft.property,
    );
    const patch: Partial<StyleRule> = {
      property: addDraft.property,
      value: addDraft.value,
      valuesByBreakpoint: addDraft.valuesByBreakpoint,
    };
    if (existingIndex >= 0) {
      onChange(upsertStyleRule(styles, existingIndex, patch));
    } else {
      onChange([...styles, addDraft]);
    }
    setAddOpen(false);
    setAddDraft(null);
    setAddSubViewActive(false);
  };

  const handleEditOpenChange = (index: number, open: boolean) => {
    if (open) {
      onInteraction?.();
      setAddOpen(false);
      setAddDraft(null);
      setAddSubViewActive(false);
      setEditSubViewActive(false);
      setEditingIndex(index);
      setEditDraft({ ...styles[index]! });
      return;
    }
    setEditingIndex(null);
    setEditDraft(null);
    setEditSubViewActive(false);
  };

  const confirmEdit = (index: number) => {
    if (!editDraft) {
      return;
    }
    onChange(
      upsertStyleRule(styles, index, {
        property: editDraft.property,
        value: editDraft.value,
        valuesByBreakpoint: editDraft.valuesByBreakpoint,
      }),
    );
    setEditingIndex(null);
    setEditDraft(null);
    setEditSubViewActive(false);
  };

  const addTrigger = (
    <Popover
      open={addOpen}
      onOpenChange={handleAddOpenChange}
      layer="elevated"
      placement="right-start"
      title={
        addSubViewActive
          ? (labels.styleAddBreakpoint ?? labels.addStyleRule)
          : labels.addStyleRule
      }
      panelClassName={STYLE_RULES_POPOVER_PANEL_CLASS}
      trigger={
        <IconButton type="button" label={labels.addStyleRule} size="sm">
          <PlusIcon />
        </IconButton>
      }
    >
      {addDraft ? (
        <div className="flex flex-col gap-5">
          <StyleRuleEditorFields
            rule={addDraft}
            labels={labels}
            onChange={(patch) =>
              setAddDraft(mergeStyleRulePatch(addDraft, patch))
            }
            onSubViewChange={setAddSubViewActive}
          />
          {!addSubViewActive ? (
            <div className="border-border/60 flex items-center justify-between gap-2 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAddOpen(false)}
              >
                {cancelLabel}
              </Button>
              <Button type="button" size="sm" onClick={confirmAdd}>
                {labels.addStyleRule}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </Popover>
  );

  const table = (
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
                  {formatStyleRuleValuePreview(rule)}
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-1">
                    <Popover
                      open={editingIndex === index}
                      onOpenChange={(open) => handleEditOpenChange(index, open)}
                      layer="elevated"
                      placement="right-start"
                      title={
                        editSubViewActive && editingIndex === index
                          ? (labels.styleEditBreakpoint ?? saveLabel)
                          : saveLabel
                      }
                      panelClassName={STYLE_RULES_POPOVER_PANEL_CLASS}
                      trigger={
                        <IconButton type="button" label={saveLabel} size="sm">
                          <PencilIcon />
                        </IconButton>
                      }
                    >
                      {editDraft && editingIndex === index ? (
                        <div className="flex flex-col gap-5">
                          <StyleRuleEditorFields
                            rule={editDraft}
                            labels={labels}
                            onChange={(patch) =>
                              setEditDraft(
                                mergeStyleRulePatch(editDraft, patch),
                              )
                            }
                            onSubViewChange={setEditSubViewActive}
                          />
                          {!editSubViewActive ? (
                            <div className="border-border/60 flex items-center justify-between gap-2 border-t pt-4">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleEditOpenChange(index, false)
                                }
                              >
                                {cancelLabel}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => confirmEdit(index)}
                              >
                                {saveLabel}
                              </Button>
                            </div>
                          ) : null}
                        </div>
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
  );

  return { addTrigger, table };
}

export interface StyleRulesPopoverTableProps extends UseStyleRulesPopoverEditorOptions {
  readonly headerEnd?: ReactNode;
}

export function StyleRulesPopoverTable({
  headerEnd,
  ...options
}: StyleRulesPopoverTableProps) {
  const { addTrigger, table } = useStyleRulesPopoverEditor(options);

  return (
    <div className="flex flex-col gap-2">
      {headerEnd ? (
        <div className="flex items-center justify-end gap-2">
          {headerEnd}
          {addTrigger}
        </div>
      ) : null}
      {table}
    </div>
  );
}
