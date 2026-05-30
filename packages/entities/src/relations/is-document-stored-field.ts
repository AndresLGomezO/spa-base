import type { FieldConfig, RelationConfig } from "../types.js";
import { usesForeignKeyStorage } from "./relationConfig.js";

type FieldMetaLike = {
  readonly type: string;
  readonly relation?: {
    readonly type: string;
  };
};

function asRelationConfig(
  relation: FieldMetaLike["relation"],
): RelationConfig | null {
  if (!relation) {
    return null;
  }
  return relation as RelationConfig;
}

export function isDocumentStoredField(meta: FieldMetaLike): boolean {
  if (meta.type !== "relation" || !meta.relation) {
    return true;
  }

  return usesForeignKeyStorage(asRelationConfig(meta.relation)!);
}

export function isDocumentStoredFieldConfig(fieldConfig: FieldConfig): boolean {
  if (fieldConfig.type !== "relation") {
    return true;
  }

  return usesForeignKeyStorage(fieldConfig.relation);
}

export function isJoinCollectionRelationField(
  meta: FieldMetaLike,
): meta is FieldMetaLike & {
  readonly type: "relation";
  readonly relation: { readonly type: "many-to-many" };
} {
  return meta.type === "relation" && meta.relation?.type === "many-to-many";
}
