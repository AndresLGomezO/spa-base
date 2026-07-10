import type { ReactNode } from "react";

import { ItemListDesignerComponentColumnPanelHeaderMenu } from "./ItemListDesignerComponentColumnPanelHeaderMenu";
import { ItemListDesignerComponentRowPanelHeaderMenu } from "./ItemListDesignerComponentRowPanelHeaderMenu";
import { ItemListDesignerStructurePanelFooter } from "./ItemListDesignerStructurePanelFooter";
import type { ItemListPanelSession } from "./item-list-designer-panel-session";
import { ItemListStructurePanelBody } from "./ItemListStructurePanelBody";

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
      body: <ItemListStructurePanelBody session={session} />,
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
      body: <ItemListStructurePanelBody session={session} />,
      footer: <ItemListDesignerStructurePanelFooter />,
    };
  }

  return {
    headerActions: (
      <ItemListDesignerComponentRowPanelHeaderMenu rowRef={target.rowRef} />
    ),
    body: <ItemListStructurePanelBody session={session} />,
    footer: <ItemListDesignerStructurePanelFooter />,
  };
}
