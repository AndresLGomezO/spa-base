import type { ReactNode } from "react";

import { LayoutGrid, LayoutStack } from "./LayoutGrid.js";
import { LayoutSlot } from "./LayoutSlot.js";
import type {
  CardLayoutConfig,
  CardSlotRenderer,
  LayoutContainerNode,
  LayoutNode,
} from "./types.js";

function renderContainer(
  node: LayoutContainerNode,
  renderSlot: CardSlotRenderer,
): ReactNode {
  const Container = node.type === "stack" ? LayoutStack : LayoutGrid;

  return (
    <Container
      key={node.id}
      direction={node.direction}
      gap={node.gap}
      columns={node.type === "grid" ? node.columns : undefined}
      className={node.className}
      align={node.align}
      justify={node.justify}
      minWidth={node.minWidth}
      maxWidth={node.maxWidth}
      minHeight={node.minHeight}
      maxHeight={node.maxHeight}
      flex={node.flex}
    >
      {node.children.map((child, index) =>
        renderLayoutNode(child, renderSlot, `${node.id ?? "node"}-${index}`),
      )}
    </Container>
  );
}

function renderLayoutNode(
  node: LayoutNode,
  renderSlot: CardSlotRenderer,
  fallbackKey: string,
): ReactNode {
  if (node.type === "slot") {
    return (
      <LayoutSlot
        key={node.id ?? node.slotId ?? fallbackKey}
        className={node.className}
        align={node.align}
        justify={node.justify}
        minWidth={node.minWidth}
        maxWidth={node.maxWidth}
        minHeight={node.minHeight}
        maxHeight={node.maxHeight}
        flex={node.flex}
      >
        {renderSlot(node.slotId, undefined)}
      </LayoutSlot>
    );
  }

  return renderContainer(node, renderSlot);
}

export interface LayoutRendererProps {
  readonly layout: CardLayoutConfig;
  readonly renderSlot: CardSlotRenderer;
}

export function LayoutRenderer({ layout, renderSlot }: LayoutRendererProps) {
  const boundRenderSlot: CardSlotRenderer = (slotId) => {
    const binding = layout.slots[slotId];
    return renderSlot(slotId, binding);
  };

  return <>{renderLayoutNode(layout.root, boundRenderSlot, "root")}</>;
}
