import type { FieldComponentType } from "@repo/entities";

export type ComponentRegistryKey = FieldComponentType | (string & {});

const componentRegistry = new Map<string, string>();

const DEFAULT_COMPONENT_IDS: Record<FieldComponentType, string> = {
  input: "input",
  number: "number",
  toggle: "toggle",
  date: "date",
  relation: "relation",
};

export function registerComponent(
  componentId: ComponentRegistryKey,
  implementationId: string,
): void {
  componentRegistry.set(componentId, implementationId);
}

export function resolveComponentId(
  component: FieldComponentType | string | undefined,
  fieldType: string,
): string {
  if (component) {
    return componentRegistry.get(component) ?? component;
  }

  if (fieldType === "boolean") return DEFAULT_COMPONENT_IDS.toggle;
  if (fieldType === "number") return DEFAULT_COMPONENT_IDS.number;
  if (fieldType === "date") return DEFAULT_COMPONENT_IDS.date;
  if (fieldType === "relation") return DEFAULT_COMPONENT_IDS.relation;
  return DEFAULT_COMPONENT_IDS.input;
}

export function clearComponentRegistry(): void {
  componentRegistry.clear();
}
