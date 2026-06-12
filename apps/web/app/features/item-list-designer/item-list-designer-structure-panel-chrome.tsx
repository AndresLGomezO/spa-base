import type { ReactNode } from "react";

import { ItemListDesignerComponentColumnPanel } from "./ItemListDesignerComponentColumnPanel";
import { ItemListDesignerComponentColumnPanelHeaderMenu } from "./ItemListDesignerComponentColumnPanelHeaderMenu";
import { ItemListDesignerComponentRowPanel } from "./ItemListDesignerComponentRowPanel";
import { ItemListDesignerComponentRowPanelHeaderMenu } from "./ItemListDesignerComponentRowPanelHeaderMenu";
import { ItemListDesignerGroupedColumnPanel } from "./ItemListDesignerGroupedColumnPanel";
import { ItemListDesignerStructurePanelFooter } from "./ItemListDesignerStructurePanelFooter";
import {
  ItemListDesignerContext,
  type ItemListDesignerContextValue,
} from "./item-list-designer-context";
import type { ItemListPanelSession } from "./item-list-designer-panel-session";

function withItemListContext(
  value: ItemListDesignerContextValue,
  children: ReactNode,
): ReactNode {
  return (
    <ItemListDesignerContext.Provider value={value}>
      {children}
    </ItemListDesignerContext.Provider>
  );
}

export function renderItemListStructurePanelChrome(
  contextValue: ItemListDesignerContextValue,
  session: ItemListPanelSession,
): {
  readonly headerActions?: ReactNode;
  readonly body: ReactNode;
  readonly footer: ReactNode;
} {
  const { target } = session;

  if (target.kind === "groupedColumn") {
    return {
      body: withItemListContext(
        contextValue,
        <ItemListDesignerGroupedColumnPanel columnIndex={target.columnIndex} />,
      ),
      footer: withItemListContext(
        contextValue,
        <ItemListDesignerStructurePanelFooter />,
      ),
    };
  }

  if (target.kind === "column") {
    return {
      headerActions: withItemListContext(
        contextValue,
        <ItemListDesignerComponentColumnPanelHeaderMenu
          columnRef={target.columnRef}
        />,
      ),
      body: withItemListContext(
        contextValue,
        <ItemListDesignerComponentColumnPanel columnRef={target.columnRef} />,
      ),
      footer: withItemListContext(
        contextValue,
        <ItemListDesignerStructurePanelFooter />,
      ),
    };
  }

  return {
    headerActions: withItemListContext(
      contextValue,
      <ItemListDesignerComponentRowPanelHeaderMenu rowRef={target.rowRef} />,
    ),
    body: withItemListContext(
      contextValue,
      <ItemListDesignerComponentRowPanel rowRef={target.rowRef} />,
    ),
    footer: withItemListContext(
      contextValue,
      <ItemListDesignerStructurePanelFooter />,
    ),
  };
}
