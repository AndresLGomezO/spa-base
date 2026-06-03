import type { DataSource, UiComponentKind } from "../types/component.js";

export function listDataSourcePaths(
  primary: DataSource,
  fallbacks?: readonly DataSource[],
): readonly string[] {
  const paths: string[] = [];

  if (primary.type === "field") {
    const trimmed = primary.path.trim();
    if (trimmed.length > 0) {
      paths.push(trimmed);
    }
  }

  for (const source of fallbacks ?? []) {
    if (source.type !== "field") {
      continue;
    }
    const trimmed = source.path.trim();
    if (trimmed.length > 0 && !paths.includes(trimmed)) {
      paths.push(trimmed);
    }
  }

  return paths;
}

export function resolveStaticDataSource(
  primary: DataSource,
  fallbacks?: readonly DataSource[],
): string | undefined {
  if (primary.type === "static" && primary.value.trim().length > 0) {
    return primary.value;
  }

  for (const source of fallbacks ?? []) {
    if (source.type === "static" && source.value.trim().length > 0) {
      return source.value;
    }
  }

  return undefined;
}

export function isGenericFieldValuePresent(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  return true;
}

export interface ResolveFieldChainOptions {
  readonly primary: DataSource;
  readonly fallbacks?: readonly DataSource[];
  readonly kind: UiComponentKind;
  readonly resolveField: (path: string) => unknown;
  readonly isImagePresent?: (path: string, rawValue: unknown) => boolean;
}

export interface ResolvedFieldChain {
  readonly fieldPath: string;
  readonly rawValue: unknown;
  readonly usedStatic: boolean;
  readonly staticValue?: string;
}

export function resolveFieldChain(
  options: ResolveFieldChainOptions,
): ResolvedFieldChain {
  const staticValue = resolveStaticDataSource(
    options.primary,
    options.fallbacks,
  );
  if (staticValue !== undefined) {
    return {
      fieldPath: "",
      rawValue: staticValue,
      usedStatic: true,
      staticValue,
    };
  }

  const paths = listDataSourcePaths(options.primary, options.fallbacks);

  for (const fieldPath of paths) {
    const rawValue = options.resolveField(fieldPath);
    const present =
      options.kind === "image" && options.isImagePresent
        ? options.isImagePresent(fieldPath, rawValue)
        : isGenericFieldValuePresent(rawValue);

    if (present) {
      return { fieldPath, rawValue, usedStatic: false };
    }
  }

  const lastPath = paths[paths.length - 1] ?? "";
  return {
    fieldPath: lastPath,
    rawValue: lastPath ? options.resolveField(lastPath) : null,
    usedStatic: false,
  };
}
