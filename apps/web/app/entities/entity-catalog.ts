import { Customer, Order } from "@repo/shared-types";
import { Package, ShoppingCart } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type AnyDefinedEntity = typeof Customer | typeof Order;

interface EntityCatalogEntry {
  readonly entity: AnyDefinedEntity;
  readonly navLabelKey: "customer" | "order";
  readonly icon: LucideIcon;
}

export const ENTITY_CATALOG = {
  customer: {
    entity: Customer,
    navLabelKey: "customer",
    icon: Package,
  },
  order: {
    entity: Order,
    navLabelKey: "order",
    icon: ShoppingCart,
  },
} as const satisfies Record<string, EntityCatalogEntry>;

export type EntityName = keyof typeof ENTITY_CATALOG;

const ENTITY_NAMES = Object.keys(ENTITY_CATALOG) as EntityName[];

export const ENTITY_NAV_ITEMS = ENTITY_NAMES.map((name) => ({
  id: name,
  labelKey: ENTITY_CATALOG[name].navLabelKey,
  to: `/app/${name}`,
  matchPath: `/app/${name}`,
  icon: ENTITY_CATALOG[name].icon,
}));

export function isEntityName(value: string): value is EntityName {
  return value in ENTITY_CATALOG;
}

export function getEntityDefinition(name: EntityName): EntityCatalogEntry {
  return ENTITY_CATALOG[name];
}

const SYSTEM_FIELD_KEYS = new Set(["id", "tenantId", "createdAt", "updatedAt"]);

export function getEditableFieldNames(entity: AnyDefinedEntity): string[] {
  return Object.keys(entity.metadata.fields).filter(
    (fieldName) => !SYSTEM_FIELD_KEYS.has(fieldName),
  );
}

export function formatFieldLabel(fieldName: string): string {
  return fieldName
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase())
    .trim();
}
