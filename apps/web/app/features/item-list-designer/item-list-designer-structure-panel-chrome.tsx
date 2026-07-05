import type { ReactNode } from "react";

import { ItemListDesignerComponentColumnPanel } from "./ItemListDesignerComponentColumnPanel";
import { ItemListDesignerComponentColumnPanelHeaderMenu } from "./ItemListDesignerComponentColumnPanelHeaderMenu";
import { ItemListDesignerComponentRowPanel } from "./ItemListDesignerComponentRowPanel";
import { ItemListDesignerComponentRowPanelHeaderMenu } from "./ItemListDesignerComponentRowPanelHeaderMenu";
import { ItemListDesignerGroupedColumnPanel } from "./ItemListDesignerGroupedColumnPanel";
import { ItemListDesignerStructurePanelFooter } from "./ItemListDesignerStructurePanelFooter";
import type { ItemListPanelSession } from "./item-list-designer-panel-session";

export function renderItemListStructurePanelContent(
  session: ItemListPanelSession,
): {
  readonly headerActions?: ReactNode;
  readonly body: ReactNode;
  readonly footer: ReactNode;
} {
  const { target } = session;

  if (target.kind === "groupedColumn") {
    return {
      body: (
        <ItemListDesignerGroupedColumnPanel columnIndex={target.columnIndex} />
      ),
      footer: <ItemListDesignerStructurePanelFooter />,
    };
  }

  if (target.kind === "column") {
    return {
      headerActions: (
        <ItemListDesignerComponentColumnPanelHeaderMenu
          columnRef={target.columnRef}
        />
      ),
      body: (
        <ItemListDesignerComponentColumnPanel columnRef={target.columnRef} />
      ),
      footer: <ItemListDesignerStructurePanelFooter />,
    };
  }

  return {
    headerActions: (
      <ItemListDesignerComponentRowPanelHeaderMenu rowRef={target.rowRef} />
    ),
    body: <ItemListDesignerComponentRowPanel rowRef={target.rowRef} />,
    footer: <ItemListDesignerStructurePanelFooter />,
  };
}
