import type { EntityCatalogEntry } from "../entities/entity-catalog";

type Resolve = (key: string, fallback: string) => string;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function localizeStaticPrimary(
  primary: unknown,
  resolve: Resolve,
  key: string,
): unknown {
  if (
    !isPlainObject(primary) ||
    primary.type !== "static" ||
    typeof primary.value !== "string" ||
    !primary.value.trim()
  ) {
    return primary;
  }
  return {
    ...primary,
    value: resolve(key, primary.value),
  };
}

/**
 * Return a shallow-localized entity definition for display
 * (nav + field labels + metric widget layouts).
 */
export function localizeEntityDefinition(
  definition: EntityCatalogEntry,
  resolve: Resolve,
): EntityCatalogEntry {
  const entityKey = `entity.${definition.name}`;
  const fallbackLabel =
    definition.ui.nav?.label ??
    ("label" in definition && typeof definition.label === "string"
      ? definition.label
      : definition.name);
  const navLabel = resolve(`${entityKey}.nav.label`, fallbackLabel);
  const description =
    typeof definition.description === "string"
      ? resolve(`${entityKey}.description`, definition.description)
      : definition.description;

  const nextFields: Record<
    string,
    NonNullable<EntityCatalogEntry["ui"]["fields"]>[string]
  > = {};
  for (const [fieldName, fieldUi] of Object.entries(
    definition.ui.fields ?? {},
  )) {
    if (!fieldUi) continue;
    nextFields[fieldName] = {
      ...fieldUi,
      ...(typeof fieldUi.label === "string"
        ? {
            label: resolve(
              `${entityKey}.fields.${fieldName}.ui.label`,
              fieldUi.label,
            ),
          }
        : {}),
      ...(typeof fieldUi.placeholder === "string"
        ? {
            placeholder: resolve(
              `${entityKey}.fields.${fieldName}.ui.placeholder`,
              fieldUi.placeholder,
            ),
          }
        : {}),
    };
  }

  const metricWidgets = definition.ui.metricWidgets?.map((widget) => ({
    ...widget,
    name: resolve(
      `metricWidget.${definition.name}.${widget.id}.name`,
      widget.name,
    ),
    layout: localizeLayoutDocument(
      widget.layout,
      resolve,
      `metricWidget.${definition.name}.${widget.id}`,
    ) as typeof widget.layout,
  }));

  const metricRowLayout = definition.ui.metricRowLayout
    ? (localizeLayoutDocument(
        definition.ui.metricRowLayout,
        resolve,
        `metricRow.${definition.name}`,
      ) as typeof definition.ui.metricRowLayout)
    : definition.ui.metricRowLayout;

  return {
    ...definition,
    ...(description !== undefined ? { description } : {}),
    ui: {
      ...definition.ui,
      nav: definition.ui.nav
        ? { ...definition.ui.nav, label: navLabel }
        : { label: navLabel },
      fields: nextFields,
      ...(metricWidgets ? { metricWidgets } : {}),
      ...(metricRowLayout ? { metricRowLayout } : {}),
    },
  };
}

/**
 * Localize user-facing strings in a UI layout tree.
 * Keys: `{prefix}.{nodeId}.label|name|static`
 * Also resolves `component.primary` static text on component rows.
 */
export function localizeLayoutDocument(
  document: unknown,
  resolve: Resolve,
  prefix: string,
): unknown {
  if (Array.isArray(document)) {
    return document.map((child) =>
      localizeLayoutDocument(child, resolve, prefix),
    );
  }
  if (!document || typeof document !== "object") {
    return document;
  }

  const node = document as Record<string, unknown>;
  const next: Record<string, unknown> = { ...node };
  const id = typeof node.id === "string" ? node.id.trim() : null;

  if (id) {
    if (typeof node.label === "string" && node.label.trim()) {
      next.label = resolve(`${prefix}.${id}.label`, node.label);
    }
    if (typeof node.name === "string" && node.name.trim()) {
      next.name = resolve(`${prefix}.${id}.name`, node.name);
    }
    next.primary = localizeStaticPrimary(
      node.primary,
      resolve,
      `${prefix}.${id}.static`,
    );

    const component = node.component;
    if (isPlainObject(component)) {
      const nextComponent: Record<string, unknown> = { ...component };
      if (typeof component.label === "string" && component.label.trim()) {
        nextComponent.label = resolve(`${prefix}.${id}.label`, component.label);
      }
      nextComponent.primary = localizeStaticPrimary(
        component.primary,
        resolve,
        `${prefix}.${id}.static`,
      );
      // Recurse into nested layout children inside the component.
      for (const [key, child] of Object.entries(component)) {
        if (key === "primary" || key === "label") continue;
        if (child && typeof child === "object") {
          nextComponent[key] = localizeLayoutDocument(child, resolve, prefix);
        }
      }
      next.component = nextComponent;
    }
  }

  for (const [key, child] of Object.entries(node)) {
    if (
      key === "primary" ||
      key === "label" ||
      key === "name" ||
      key === "component"
    ) {
      continue;
    }
    if (child && typeof child === "object") {
      next[key] = localizeLayoutDocument(child, resolve, prefix);
    }
  }

  return next;
}
