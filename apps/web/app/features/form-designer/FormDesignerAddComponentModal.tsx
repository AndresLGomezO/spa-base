import { useMemo, type ComponentType } from "react";
import { Button, Modal, Text } from "@repo/ui";
import { cn } from "@repo/theme/utils";
import type { DesignSurface } from "@repo/ui-builder-core";

import {
  getFilteredComponentCatalog,
  type CatalogEntryKind,
} from "./form-designer-component-catalog";
import type { FormDesignerComponentsLabels } from "./form-designer-components-labels";
import type { InsertAnchor } from "./form-designer-structure-tree";

interface FormDesignerAddComponentModalProps {
  readonly open: boolean;
  readonly designSurface: DesignSurface;
  readonly labels: FormDesignerComponentsLabels;
  readonly onClose: () => void;
  readonly onSelect: (anchor: InsertAnchor, kind: CatalogEntryKind) => void;
  readonly insertAnchor: InsertAnchor | null;
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
  labels,
  onClose,
  onSelect,
  insertAnchor,
}: FormDesignerAddComponentModalProps) {
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

  return (
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
  );
}
