import type { SerializableFieldMeta } from "./types.js";

const IMAGE_FIELD_NAME_PATTERN = /^(logo|photo|avatar|thumbnail|image)$/i;

function isImageListField(
  fieldPath: string,
  meta: SerializableFieldMeta | undefined,
): boolean {
  return meta?.type === "image" || IMAGE_FIELD_NAME_PATTERN.test(fieldPath);
}

export function resolveListImageField(
  fields: Readonly<Record<string, SerializableFieldMeta>>,
  fieldPaths: readonly string[],
): string | undefined {
  for (const fieldPath of fieldPaths) {
    if (isImageListField(fieldPath, fields[fieldPath])) {
      return fieldPath;
    }
  }

  for (const [fieldPath, meta] of Object.entries(fields)) {
    if (isImageListField(fieldPath, meta)) {
      return fieldPath;
    }
  }

  return undefined;
}

export interface PartitionExpandableListFieldsResult {
  readonly imageFieldPath?: string;
  readonly mainColumnFields: readonly string[];
  readonly expandFields: readonly string[];
  readonly isExpandable: boolean;
}

export function appendImageFieldToViewFields(
  fieldPaths: readonly string[],
  imageFieldPath?: string,
): readonly string[] {
  if (!imageFieldPath || fieldPaths.includes(imageFieldPath)) {
    return [...fieldPaths];
  }
  return [...fieldPaths, imageFieldPath];
}

export function partitionExpandableListFields(
  fieldPaths: readonly string[],
  fields: Readonly<Record<string, SerializableFieldMeta>>,
): PartitionExpandableListFieldsResult {
  const imageFieldPath = resolveListImageField(fields, fieldPaths);
  const dataFields = fieldPaths.filter((path) => path !== imageFieldPath);
  const mainColumnFields = dataFields.slice(0, 3);
  const expandFields = dataFields.slice(3);

  return {
    ...(imageFieldPath ? { imageFieldPath } : {}),
    mainColumnFields,
    expandFields,
    isExpandable: expandFields.length > 0,
  };
}
