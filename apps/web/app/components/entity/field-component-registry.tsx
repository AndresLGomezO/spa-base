import type { ComponentType } from "react";

const fieldComponents = new Map<string, ComponentType<FieldComponentProps>>();

export interface FieldComponentProps {
  readonly entityName: string;
  readonly fieldName: string;
  readonly value: unknown;
  readonly label: string;
  readonly required?: boolean;
  readonly error?: string;
  readonly readOnly?: boolean;
  readonly recordId?: string;
  readonly maxSizeBytes?: number;
  readonly defaultImageUrl?: string | null;
  readonly hideLabel?: boolean;
  readonly isArray?: boolean;
  readonly onChange: (fieldName: string, value: unknown) => void;
}

export function registerFieldComponent(
  implementationId: string,
  component: ComponentType<FieldComponentProps>,
): void {
  fieldComponents.set(implementationId, component);
}

export function resolveFieldComponent(
  implementationId: string,
): ComponentType<FieldComponentProps> | undefined {
  return fieldComponents.get(implementationId);
}
