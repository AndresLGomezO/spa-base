import { useCallback, useEffect, useMemo, useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import {
  IconButton,
  SegmentedSwitch,
  Text,
  type SegmentedSwitchOption,
} from "@repo/ui";
import { entityFormFieldAdapter } from "@repo/ui-builder-react";
import { moveRowAt } from "@repo/ui-builder-core";
import { cn } from "@repo/theme/utils";
import { useTranslation } from "react-i18next";

import { useEntityDefinition } from "../../entities/entity-catalog-context";
import { formDesignerComponentsLabels } from "./form-designer-components-labels";
import { FormDesignerStructureTree } from "./FormDesignerStructureTree";
import {
  FormDesignerStructureTreeCollapsedScopeMenu,
  FormDesignerStructureTreeCollapsedStepMenu,
} from "./FormDesignerStructureTreeCollapsedScopeMenu";
import { useFormDesignerComponentsSession } from "./FormDesignerComponentsSession";
import {
  clampComponentsStepIndex,
  resolveComponentsLayoutBinding,
  type ComponentsTreeScope,
} from "./form-designer-components-layout";
import { toComponentColumnRef } from "./form-designer-component-column-ref";
import {
  areComponentRowRefsEqual,
  toComponentRowRef,
} from "./form-designer-component-row-ref";
import type {
  InsertAnchor,
  StructureColumnNode,
  StructureRowNode,
} from "./form-designer-structure-tree";
import { useFormDesigner } from "./form-designer-context";

interface FormDesignerStructureTreePanelProps {
  readonly onInsert: (anchor: InsertAnchor) => void;
}

function buildScopeOptions(
  presentation: "plain" | "wizard",
  hasDedicatedFooter: boolean,
  labels: ReturnType<typeof formDesignerComponentsLabels>,
): readonly SegmentedSwitchOption<ComponentsTreeScope>[] {
  if (presentation === "wizard") {
    const options: SegmentedSwitchOption<ComponentsTreeScope>[] = [
      {
        value: "shell",
        label: labels.wizardScopeShell,
        ariaLabel: labels.wizardScopeShell,
      },
      {
        value: "step",
        label: labels.wizardScopeStep,
        ariaLabel: labels.wizardScopeStep,
      },
    ];

    if (hasDedicatedFooter) {
      options.push({
        value: "footer",
        label: labels.wizardScopeFooter,
        ariaLabel: labels.wizardScopeFooter,
      });
    }

    return options;
  }

  if (hasDedicatedFooter) {
    return [
      {
        value: "main",
        label: labels.wizardScopeContent,
        ariaLabel: labels.wizardScopeContent,
      },
      {
        value: "footer",
        label: labels.wizardScopeFooter,
        ariaLabel: labels.wizardScopeFooter,
      },
    ];
  }

  return [];
}

export function FormDesignerStructureTreePanel({
  onInsert,
}: FormDesignerStructureTreePanelProps) {
  const { t } = useTranslation("common");
  const {
    editor,
    markComponentsDirty,
    requestComponentRowPanel,
    requestComponentColumnPanel,
    requestCloseComponentRowPanel,
    selectedComponentRowRef,
    componentRowPanelOpen,
  } = useFormDesigner();
  const {
    treeScope,
    setTreeScope,
    stepIndex,
    setStepIndex,
    focusedRow,
    focusedColumn,
    selectedRow,
    selectedColumn,
    treeRowFocus,
    treeColumnFocus,
    setFocusedRow,
    setFocusedColumn,
    setSelectedRow,
    setSelectedColumn,
    clearColumnHover,
    clearRowHover,
    hoverRow,
    hoverColumn,
  } = useFormDesignerComponentsSession();
  const definition = useEntityDefinition(editor.definition.name);
  const labels = useMemo(() => formDesignerComponentsLabels(t), [t]);
  const [collapsed, setCollapsed] = useState(false);

  const fieldDescriptors = useMemo(
    () => entityFormFieldAdapter(definition).fieldDescriptors,
    [definition],
  );

  const hasDedicatedFooter = editor.modalFooterLayout != null;

  const clampedStepIndex = clampComponentsStepIndex(
    stepIndex,
    editor.wizard.steps.length,
  );

  const binding = useMemo(
    () => resolveComponentsLayoutBinding(editor, treeScope, clampedStepIndex),
    [clampedStepIndex, editor, treeScope],
  );

  const scopeOptions = useMemo(
    () => buildScopeOptions(editor.presentation, hasDedicatedFooter, labels),
    [editor.presentation, hasDedicatedFooter, labels],
  );

  const showScopeSwitcher = scopeOptions.length > 0;

  const handleMoveRowUp = useCallback(
    (row: StructureRowNode) => {
      binding.setLayout(moveRowAt(binding.layout, row.locator, row.rowId, -1));
      markComponentsDirty();
    },
    [binding, markComponentsDirty],
  );

  const handleMoveRowDown = useCallback(
    (row: StructureRowNode) => {
      binding.setLayout(moveRowAt(binding.layout, row.locator, row.rowId, 1));
      markComponentsDirty();
    },
    [binding, markComponentsDirty],
  );

  const handleRemoveRow = useCallback(
    (row: StructureRowNode) => {
      const rowRef = toComponentRowRef(row.rowId, row.locator);
      binding.removeRow(rowRef);
      markComponentsDirty();
      if (areComponentRowRefsEqual(selectedComponentRowRef, rowRef)) {
        requestCloseComponentRowPanel();
      }
    },
    [
      binding,
      markComponentsDirty,
      requestCloseComponentRowPanel,
      selectedComponentRowRef,
    ],
  );

  const handleRowSelect = useCallback(
    (row: StructureRowNode) => {
      const rowRef = toComponentRowRef(row.rowId, row.locator);
      clearColumnHover();
      setFocusedRow(rowRef);
      setSelectedRow(rowRef);
      requestComponentRowPanel(rowRef, row.label, {
        treeScope,
        stepIndex: clampedStepIndex,
      });
    },
    [
      clampedStepIndex,
      clearColumnHover,
      requestComponentRowPanel,
      setFocusedRow,
      setSelectedRow,
      treeScope,
    ],
  );

  const handleColumnSelect = useCallback(
    (column: StructureColumnNode) => {
      const columnRef = toComponentColumnRef(column);
      clearRowHover();
      setFocusedColumn(columnRef);
      setSelectedColumn(columnRef);
      requestComponentColumnPanel(columnRef, column.label, {
        treeScope,
        stepIndex: clampedStepIndex,
      });
    },
    [
      clampedStepIndex,
      clearRowHover,
      requestComponentColumnPanel,
      setFocusedColumn,
      setSelectedColumn,
      treeScope,
    ],
  );

  useEffect(() => {
    if (treeScope === "footer" && !hasDedicatedFooter) {
      setTreeScope(editor.presentation === "wizard" ? "shell" : "main");
      return;
    }

    const allowedScopes = new Set(scopeOptions.map((option) => option.value));
    if (!allowedScopes.has(treeScope)) {
      setTreeScope(scopeOptions[0]?.value ?? "main");
    }
  }, [
    editor.presentation,
    hasDedicatedFooter,
    scopeOptions,
    setTreeScope,
    treeScope,
  ]);

  useEffect(() => {
    if (treeRowFocus) {
      const treeNode = document.querySelector(
        `[data-tree-node-id="row-${treeRowFocus.rowId}"]`,
      );
      treeNode?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      return;
    }

    if (!treeColumnFocus) {
      return;
    }

    const nestedId =
      treeColumnFocus.nestedParentRowId != null &&
      treeColumnFocus.nestedColumnIndex != null
        ? `col-${treeColumnFocus.nestedParentRowId}-${treeColumnFocus.nestedColumnIndex}`
        : `col-root-${treeColumnFocus.rootColumnIndex}`;
    const treeNode = document.querySelector(
      `[data-tree-node-id="${nestedId}"]`,
    );
    treeNode?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [treeColumnFocus, treeRowFocus]);

  if (collapsed) {
    return (
      <aside
        className={cn(
          "bg-card border-border flex min-h-[28rem] w-12 shrink-0 flex-col items-center rounded-xl border shadow-sm",
          "transition-[width,opacity] duration-300 ease-out",
        )}
      >
        <div className="border-border flex w-full flex-col items-center gap-2 border-b px-1.5 py-2.5">
          <IconButton
            type="button"
            size="sm"
            label={labels.expandPanel}
            onClick={() => setCollapsed(false)}
          >
            <PanelLeftOpen aria-hidden className="size-4" />
          </IconButton>

          {showScopeSwitcher ? (
            <FormDesignerStructureTreeCollapsedScopeMenu
              value={treeScope}
              options={scopeOptions}
              onChange={setTreeScope}
              ariaLabel={labels.wizardScopeAriaLabel}
            />
          ) : null}

          {editor.presentation === "wizard" && treeScope === "step" ? (
            <FormDesignerStructureTreeCollapsedStepMenu
              stepIndex={clampedStepIndex}
              steps={editor.wizard.steps}
              onChange={setStepIndex}
              ariaLabel={labels.collapsedStepSelectAriaLabel}
              stepLabel={labels.wizardStepLabel}
            />
          ) : null}
        </div>

        <div className="min-h-0 w-full flex-1 overflow-y-auto overflow-x-hidden px-1.5 pb-3">
          <FormDesignerStructureTree
            variant="util"
            layout={binding.layout}
            labels={labels}
            fieldDescriptors={fieldDescriptors}
            onInsert={onInsert}
            insertDisabled={componentRowPanelOpen}
            onMoveRowUp={handleMoveRowUp}
            onMoveRowDown={handleMoveRowDown}
            onRemoveRow={handleRemoveRow}
            hoveredRow={focusedRow}
            hoveredColumn={focusedColumn}
            selectedRow={selectedRow}
            selectedColumn={selectedColumn}
            componentRowPanelOpen={componentRowPanelOpen}
            onRowHover={hoverRow}
            onRowSelect={handleRowSelect}
            onColumnHover={hoverColumn}
            onColumnSelect={handleColumnSelect}
          />
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={cn(
        "bg-card border-border flex min-h-[28rem] w-fit max-w-full shrink-0 flex-col rounded-xl border shadow-sm",
        "transition-[width,opacity] duration-300 ease-out",
      )}
    >
      <div className="border-border flex w-full min-w-0 items-center justify-between gap-2 border-b px-3 py-2.5">
        <Text className="text-foreground text-sm font-semibold tracking-tight">
          {labels.panelTitle}
        </Text>
        <IconButton
          type="button"
          size="sm"
          label={labels.collapsePanel}
          onClick={() => setCollapsed(true)}
        >
          <PanelLeftClose aria-hidden className="size-4" />
        </IconButton>
      </div>

      {showScopeSwitcher ? (
        <div className="border-border flex w-full min-w-0 flex-col gap-2 border-b px-3 py-2.5">
          <SegmentedSwitch
            value={treeScope}
            options={scopeOptions}
            onChange={setTreeScope}
            ariaLabel={labels.wizardScopeAriaLabel}
          />
          {editor.presentation === "wizard" && treeScope === "step" ? (
            <label className="flex flex-col gap-1">
              <span className="text-muted-foreground text-xs">
                {labels.wizardStepLabel}
              </span>
              <select
                className="border-input bg-background rounded-md border px-2 py-1.5 text-sm"
                value={clampedStepIndex}
                onChange={(event) =>
                  setStepIndex(Number.parseInt(event.target.value, 10))
                }
              >
                {editor.wizard.steps.map((step, index) => (
                  <option key={step.id} value={index}>
                    {step.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      ) : null}

      <div className="min-h-0 w-max max-w-full flex-1 overflow-y-auto overflow-x-auto px-2 pb-3">
        <FormDesignerStructureTree
          layout={binding.layout}
          labels={labels}
          fieldDescriptors={fieldDescriptors}
          onInsert={onInsert}
          insertDisabled={componentRowPanelOpen}
          onMoveRowUp={handleMoveRowUp}
          onMoveRowDown={handleMoveRowDown}
          onRemoveRow={handleRemoveRow}
          hoveredRow={focusedRow}
          hoveredColumn={focusedColumn}
          selectedRow={selectedRow}
          selectedColumn={selectedColumn}
          componentRowPanelOpen={componentRowPanelOpen}
          onRowHover={hoverRow}
          onRowSelect={handleRowSelect}
          onColumnHover={hoverColumn}
          onColumnSelect={handleColumnSelect}
        />
      </div>
    </aside>
  );
}
