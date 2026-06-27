import type { ReactNode } from "react";
import type { ColumnNode, RowLocator, RowNode } from "@repo/ui-builder-core";

export type RootColumnWrapper = (
  index: number,
  column: ColumnNode,
  children: ReactNode,
) => ReactNode;

export interface NestedColumnWrapperContext {
  readonly rootColumnIndex: number;
  readonly nestedParentRowId: string;
}

export type NestedColumnWrapper = (
  index: number,
  column: ColumnNode,
  context: NestedColumnWrapperContext,
  children: ReactNode,
) => ReactNode;

export type RowWrapper = (
  row: RowNode,
  locator: RowLocator,
  children: ReactNode,
) => ReactNode;

export interface LayoutWrapperRenderOptions {
  readonly rootColumnWrapper?: RootColumnWrapper;
  readonly nestedColumnWrapper?: NestedColumnWrapper;
  readonly rowWrapper?: RowWrapper;
  readonly renderEmptyRootColumns?: boolean;
  readonly stretchRootColumns?: boolean;
}
