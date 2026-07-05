/**
 * Resolves {{entity.field}} and {{metric.value}} placeholders in templates (Section 15.8).
 */
export interface TemplateBindingContext {
  readonly entity?: Readonly<Record<string, unknown>>;
  readonly metric?: Readonly<Record<string, unknown>>;
}

const PLACEHOLDER_PATTERN = /\{\{\s*([\w.]+)\s*\}\}/g;

export function resolveTemplatePlaceholders(
  template: string,
  context: TemplateBindingContext,
): string {
  return template.replace(PLACEHOLDER_PATTERN, (_match, path: string) => {
    const [root, ...rest] = path.split(".");
    const fieldPath = rest.join(".");

    if (root === "entity" && context.entity) {
      const value = readPath(context.entity, fieldPath);
      return value == null ? "" : String(value);
    }

    if (root === "metric" && context.metric) {
      const value = readPath(context.metric, fieldPath);
      return value == null ? "" : String(value);
    }

    return "";
  });
}

function readPath(
  record: Readonly<Record<string, unknown>>,
  path: string,
): unknown {
  if (!path) {
    return undefined;
  }

  const segments = path.split(".");
  let current: unknown = record;

  for (const segment of segments) {
    if (current == null || typeof current !== "object") {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}
