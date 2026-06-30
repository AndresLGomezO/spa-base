import type { ReactNode } from "react";
import {
  resolveComponentBoundFieldPath,
  type ComponentRowNode,
} from "@repo/ui-builder-core";

import type { LayoutRenderContext } from "../context.js";

export function wrapRowWithClickAction(
  row: ComponentRowNode,
  content: ReactNode,
  context: LayoutRenderContext,
): ReactNode {
  const clickAction = row.clickAction;
  if (!clickAction || !context.resolveComponentClickTarget) {
    return content;
  }

  const boundFieldPath = resolveComponentBoundFieldPath(row.component);
  const target = context.resolveComponentClickTarget(clickAction, {
    boundFieldPath,
  });
  if (!target) {
    return content;
  }

  if (row.component.kind === "form-field" && context.navigateComponentClick) {
    return (
      <div
        role="link"
        tabIndex={0}
        className="cursor-pointer"
        onClick={(event) => {
          event.stopPropagation();
          context.navigateComponentClick?.(target);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") {
            return;
          }
          event.preventDefault();
          event.stopPropagation();
          context.navigateComponentClick?.(target);
        }}
      >
        {content}
      </div>
    );
  }

  if (!context.componentClickWrapper) {
    return content;
  }

  return context.componentClickWrapper(target, content);
}
