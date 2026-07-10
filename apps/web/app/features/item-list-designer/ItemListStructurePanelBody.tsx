import { useMemo } from "react";

import { LayoutStructurePanelBody } from "../ui-builder/LayoutStructurePanelBody";
import { ItemListDesignerComponentColumnPanel } from "./ItemListDesignerComponentColumnPanel";
import { ItemListDesignerComponentRowPanel } from "./ItemListDesignerComponentRowPanel";
import { ItemListDesignerGroupedColumnPanel } from "./ItemListDesignerGroupedColumnPanel";
import { resolveScopeLayoutBinding } from "./item-list-designer-layout-binding";
import type { ItemListPanelSession } from "./item-list-designer-panel-session";
import { useItemListDesigner } from "./item-list-designer-context";

interface ItemListStructurePanelBodyProps {
  readonly session: ItemListPanelSession;
}

export function ItemListStructurePanelBody({
  session,
}: ItemListStructurePanelBodyProps) {
  const { editor } = useItemListDesigner();

  const binding = useMemo(
    () => resolveScopeLayoutBinding(editor, session.structureScope),
    [editor, session.structureScope],
  );

  return (
    <LayoutStructurePanelBody
      layout={binding.layout}
      target={session.target}
      groupedColumnIds={editor.expandableColumns}
    >
      {session.target.kind === "groupedColumn" ? (
        <ItemListDesignerGroupedColumnPanel
          columnIndex={session.target.columnIndex}
        />
      ) : session.target.kind === "column" ? (
        <ItemListDesignerComponentColumnPanel
          columnRef={session.target.columnRef}
        />
      ) : (
        <ItemListDesignerComponentRowPanel rowRef={session.target.rowRef} />
      )}
    </LayoutStructurePanelBody>
  );
}
