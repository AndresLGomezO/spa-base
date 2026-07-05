import { useMemo, useState, type ComponentType } from "react";
import { FileJson } from "lucide-react";
import { LayoutJsonImportDialog } from "@repo/ui-builder-react";
import type {
  ColumnNode,
  ComponentRowNode,
  DesignSurface,
  FieldPathValidationDefinition,
  UiLayoutDocument,
} from "@repo/ui-builder-core";
import { Button, Modal, Text } from "@repo/ui";
import { cn } from "@repo/theme/utils";

import {
  getFilteredComponentCatalog,
  type CatalogEntryKind,
} from "./form-designer-component-catalog";
import type { FormDesignerComponentsLabels } from "./form-designer-components-labels";
import type { InsertAnchor } from "./form-designer-structure-tree";

interface FormDesignerAddComponentModalProps {
  readonly open: boolean;
  readonly designSurface: DesignSurface;
  readonly definition: FieldPathValidationDefinition;
  readonly defaultFieldPath: string;
  readonly labels: FormDesignerComponentsLabels;
  readonly onClose: () => void;
  readonly onSelect: (anchor: InsertAnchor, kind: CatalogEntryKind) => void;
  readonly onImportRow: (anchor: InsertAnchor, row: ComponentRowNode) => void;
  readonly insertAnchor: InsertAnchor | null;
  readonly actionsInModalFooter?: boolean;
}

function ComponentOptionTile({
  label,
  icon: Icon,
  onClick,
}: {
  readonly label: string;
  readonly icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  readonly onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "hover:bg-muted/50 flex flex-col items-center gap-2 rounded-xl px-3 py-3 transition-all duration-200",
        "hover:shadow-md active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/40",
      )}
    >
      <span className="bg-background text-foreground ring-border/50 flex size-11 items-center justify-center rounded-xl shadow-sm ring-1 transition-shadow duration-200 hover:ring-primary/30">
        <Icon className="size-5" strokeWidth={1.75} />
      </span>
      <Text className="text-muted-foreground text-center text-[11px] leading-tight font-medium">
        {label}
      </Text>
    </button>
  );
}

export function FormDesignerAddComponentModal({
  open,
  designSurface,
  definition,
  defaultFieldPath,
  labels,
  onClose,
  onSelect,
  onImportRow,
  insertAnchor,
  actionsInModalFooter = false,
}: FormDesignerAddComponentModalProps) {
  const [importOpen, setImportOpen] = useState(false);
  const sections = useMemo(
    () => getFilteredComponentCatalog(designSurface),
    [designSurface],
  );

  const handleSelect = (kind: CatalogEntryKind) => {
    if (!insertAnchor) {
      return;
    }

    onSelect(insertAnchor, kind);
    onClose();
  };

  const handleImportOpen = () => {
    if (!insertAnchor) {
      return;
    }
    setImportOpen(true);
  };

  const handleImportApply = (
    data: UiLayoutDocument | ColumnNode | ComponentRowNode | ComponentRowNode,
  ) => {
    if (!insertAnchor) {
      return;
    }

    if ("type" in data && data.type === "component") {
      onImportRow(insertAnchor, data);
      setImportOpen(false);
      onClose();
    }
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={labels.modalTitle}
        size="lg"
        scrollable
        footer={
          <Button type="button" variant="outline" onClick={onClose}>
            {labels.modalCancel}
          </Button>
        }
      >
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3">
            <Text className="text-foreground text-sm font-semibold tracking-tight">
              {labels.importSectionTitle}
            </Text>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              <ComponentOptionTile
                label={labels.importJsonOption}
                icon={FileJson}
                onClick={handleImportOpen}
              />
            </div>
          </section>

          {sections.map((section) => (
            <section key={section.id} className="flex flex-col gap-3">
              <Text className="text-foreground text-sm font-semibold tracking-tight">
                {labels.sectionTitle(section.id)}
              </Text>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {section.entries.map((entry) => (
                  <ComponentOptionTile
                    key={entry.kind}
                    label={labels.optionLabel(entry.kind)}
                    icon={entry.icon}
                    onClick={() => handleSelect(entry.kind)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </Modal>

      <LayoutJsonImportDialog
        scope={{ type: "insertable-row" }}
        designSurface={designSurface}
        definition={definition}
        defaultFieldPath={defaultFieldPath}
        canApply={insertAnchor != null}
        labels={labels.layoutJsonImport}
        actionsInModalFooter={actionsInModalFooter}
        open={importOpen}
        onOpenChange={setImportOpen}
        onApply={handleImportApply}
      />
    </>
  );
}
