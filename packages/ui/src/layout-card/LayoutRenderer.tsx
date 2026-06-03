import type { ReactNode } from "react";

import { LayoutGrid, LayoutStack } from "./LayoutGrid.js";
import {
  getLayoutColumnHighlightClass,
  resolveLayoutColumnIndex,
  type LayoutColumnHighlight,
} from "./layout-column-highlight.js";
import { LayoutSlot } from "./LayoutSlot.js";
import type {
  CardLayoutConfig,
  CardSlotRenderer,
  LayoutContainerNode,
  LayoutNode,
} from "./types.js";

function renderGridContainer(
  node: LayoutContainerNode & { readonly type: "grid" },
  renderSlot: CardSlotRenderer,
  fallbackKey: string,
  gridDepth: number,
  columnHighlights: readonly LayoutColumnHighlight[] | undefined,
): ReactNode {
  return (
    <LayoutGrid
      key={node.id ?? fallbackKey}
      direction={node.direction}
      gap={node.gap}
      columns={node.columns}
      className={node.className}
      align={node.align}
      justify={node.justify}
      minWidth={node.minWidth}
      maxWidth={node.maxWidth}
      minHeight={node.minHeight}
      maxHeight={node.maxHeight}
      flex={node.flex}
    >
      {node.children.map((child, index) => {
        const columnIndex = resolveLayoutColumnIndex(child, index);
        const highlightClass = getLayoutColumnHighlightClass(columnHighlights, {
          depth: gridDepth,
          columnIndex,
          gridId: node.id,
        });
        const childKey = `${node.id ?? fallbackKey}-${index}`;
        const content = renderLayoutNode(
          child,
          renderSlot,
          childKey,
          gridDepth + 1,
          columnHighlights,
        );

        if (!highlightClass) {
          return content;
        }

        return (
          <div key={`${childKey}-highlight`} className={highlightClass}>
            {content}
          </div>
        );
      })}
    </LayoutGrid>
  );
}

function renderStackContainer(
  node: LayoutContainerNode & { readonly type: "stack" },
  renderSlot: CardSlotRenderer,
  fallbackKey: string,
  nextGridDepth: number,
  columnHighlights: readonly LayoutColumnHighlight[] | undefined,
): ReactNode {
  return (
    <LayoutStack
      key={node.id ?? fallbackKey}
      direction={node.direction}
      gap={node.gap}
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
        renderLayoutNode(
          child,
          renderSlot,
          `${node.id ?? fallbackKey}-${index}`,
          nextGridDepth,
          columnHighlights,
        ),
      )}
    </LayoutStack>
  );
}

function renderContainer(
  node: LayoutContainerNode,
  renderSlot: CardSlotRenderer,
  fallbackKey: string,
  nextGridDepth: number,
  columnHighlights: readonly LayoutColumnHighlight[] | undefined,
): ReactNode {
  if (node.type === "grid") {
    return renderGridContainer(
      node,
      renderSlot,
      fallbackKey,
      nextGridDepth,
      columnHighlights,
    );
  }

  return renderStackContainer(
    node,
    renderSlot,
    fallbackKey,
    nextGridDepth,
    columnHighlights,
  );
}

function renderLayoutNode(
  node: LayoutNode,
  renderSlot: CardSlotRenderer,
  fallbackKey: string,
  nextGridDepth: number,
  columnHighlights: readonly LayoutColumnHighlight[] | undefined,
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

  return renderContainer(
    node,
    renderSlot,
    fallbackKey,
    nextGridDepth,
    columnHighlights,
  );
}

export interface LayoutRendererProps {
  readonly layout: CardLayoutConfig;
  readonly renderSlot: CardSlotRenderer;
  readonly columnHighlights?: readonly LayoutColumnHighlight[];
}

export function LayoutRenderer({
  layout,
  renderSlot,
  columnHighlights,
}: LayoutRendererProps) {
  const boundRenderSlot: CardSlotRenderer = (slotId) => {
    const binding = layout.slots[slotId];
    return renderSlot(slotId, binding);
  };

  return (
    <>
      {renderLayoutNode(
        layout.root,
        boundRenderSlot,
        "root",
        0,
        columnHighlights,
      )}
    </>
  );
}

export type { LayoutColumnHighlight };
