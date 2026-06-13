function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function looksLikeComponent(value: Record<string, unknown>): boolean {
  return typeof value.kind === "string" && value.kind.trim().length > 0;
}

function unwrapComponentRecord(
  value: Record<string, unknown>,
): Record<string, unknown> | null {
  if (looksLikeComponent(value)) {
    return value;
  }

  const nestedComponent = value.component;
  if (isRecord(nestedComponent)) {
    return nestedComponent;
  }

  if (value.type === "component" && isRecord(nestedComponent)) {
    return nestedComponent;
  }

  const componentConfig = value.componentConfig;
  if (isRecord(componentConfig)) {
    return componentConfig;
  }

  const config = value.config;
  if (isRecord(config) && looksLikeComponent(config)) {
    return config;
  }

  const data = value.data;
  if (isRecord(data)) {
    const fromData = unwrapComponentRecord(data);
    if (fromData) {
      return fromData;
    }
  }

  const components = value.components;
  if (Array.isArray(components) && components.length > 0) {
    const first = components[0];
    if (isRecord(first)) {
      return unwrapComponentRecord(first);
    }
  }

  return null;
}

export function coerceConfigureComponentOutput(raw: unknown): {
  readonly component: Record<string, unknown>;
} | null {
  if (Array.isArray(raw)) {
    const first = raw[0];
    return isRecord(first) ? coerceConfigureComponentOutput(first) : null;
  }

  if (!isRecord(raw)) {
    return null;
  }

  const component = unwrapComponentRecord(raw);
  if (!component || !looksLikeComponent(component)) {
    return null;
  }

  return { component };
}

export function formatConfigureComponentValidationErrors(
  issues: readonly {
    readonly path: readonly PropertyKey[];
    readonly message: string;
  }[],
): string[] {
  return issues.slice(0, 5).map((issue) => {
    const path =
      issue.path.length > 0
        ? issue.path.map((segment) => String(segment)).join(".")
        : "(root)";
    return `${path}: ${issue.message}`;
  });
}
