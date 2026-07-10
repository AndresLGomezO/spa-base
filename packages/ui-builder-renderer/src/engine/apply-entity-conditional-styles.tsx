import type { CSSProperties, ReactNode } from "react";
import {
  mergeConditionalCssText,
  resolveComponentRenderStyles,
  resolveDefaultCompareFieldPath,
  resolveEntityConditionalStyles,
  type ConditionalStylesCapable,
  type MatchedConditionalStyles,
  type ResponsiveGridBreakpoint,
} from "@repo/ui-builder-core";

import type { LayoutRenderContext } from "../context.js";
import { ResponsiveStyleTag } from "../layout/ResponsiveStyleTag.js";

export interface ResolveComponentConditionalStylesOptions {
  readonly defaultCompareFieldPath?: string;
  readonly boundFieldPath?: string;
  readonly dateDisplayFormat?: string;
}

function buildCompareFieldMetaResolver(
  context: LayoutRenderContext,
  options: ResolveComponentConditionalStylesOptions = {},
) {
  return (path: string) => {
    const meta = context.resolveFieldMeta?.(path) ?? {};
    const boundPath = options.boundFieldPath ?? options.defaultCompareFieldPath;
    if (
      options.dateDisplayFormat &&
      boundPath &&
      path.trim() === boundPath.trim()
    ) {
      return {
        ...meta,
        fieldType: meta.fieldType ?? "date",
        dateDisplayFormat:
          meta.dateDisplayFormat ?? options.dateDisplayFormat,
      };
    }
    return meta;
  };
}

export function resolveComponentConditionalStyles(
  config: ConditionalStylesCapable,
  context: LayoutRenderContext,
  atBreakpoint?: ResponsiveGridBreakpoint,
  options: ResolveComponentConditionalStylesOptions = {},
): MatchedConditionalStyles {
  if (!config.conditionalStyles?.length) {
    return {};
  }

  return resolveEntityConditionalStyles(config.conditionalStyles, {
    resolveField: context.resolveField,
    resolveFieldMeta: buildCompareFieldMetaResolver(context, options),
    defaultCompareFieldPath:
      options.defaultCompareFieldPath ??
      resolveDefaultCompareFieldPath(
        config as Parameters<typeof resolveDefaultCompareFieldPath>[0],
      ),
    atBreakpoint,
  });
}

export function mergeMatchedConditionalClassName(
  baseClassName: string | undefined,
  matched: MatchedConditionalStyles,
): string {
  return [baseClassName, matched.className, matched.styleScopeClassName]
    .filter(Boolean)
    .join(" ");
}

export function wrapNodeWithConditionalStyles(
  node: ReactNode,
  matched: MatchedConditionalStyles,
  base?: {
    readonly className?: string;
    readonly style?: CSSProperties;
    readonly cssText?: string;
  },
): ReactNode {
  const className = mergeMatchedConditionalClassName(
    base?.className,
    matched,
  );
  const style = { ...base?.style, ...matched.style };
  const cssText = mergeConditionalCssText(base?.cssText, matched.cssText);
  const hasStyle = Object.keys(style).length > 0;
  const hasShell = Boolean(className) || hasStyle || cssText;

  if (!hasShell) {
    return node;
  }

  return (
    <>
      {cssText ? <ResponsiveStyleTag cssText={cssText} /> : null}
      <div
        className={className || undefined}
        style={hasStyle ? style : undefined}
      >
        {node}
      </div>
    </>
  );
}

export function wrapConfigWithConditionalStyles(
  node: ReactNode,
  config: ConditionalStylesCapable & { readonly styles?: readonly unknown[] },
  context: LayoutRenderContext,
  atBreakpoint?: ResponsiveGridBreakpoint,
  options: ResolveComponentConditionalStylesOptions = {},
): ReactNode {
  const matched = resolveComponentConditionalStyles(
    config,
    context,
    atBreakpoint,
    options,
  );
  if (!matched.className && !matched.style && !matched.cssText) {
    return node;
  }

  const baseStyles = resolveComponentRenderStyles(
    (config.styles ?? []) as Parameters<typeof resolveComponentRenderStyles>[0],
    atBreakpoint,
  );

  return wrapNodeWithConditionalStyles(node, matched, {
    className: baseStyles.containerClassName,
    style: baseStyles.containerStyle,
    cssText: baseStyles.cssText,
  });
}
