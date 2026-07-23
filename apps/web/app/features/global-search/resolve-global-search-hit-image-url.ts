import type { EntityCatalogEntry } from "../../entities/entity-catalog";
import { readEntityLayoutImageSourceUrl } from "../../components/entity/resolve-entity-layout-image-src";

const PREFERRED_IMAGE_NAME_PATTERN = /^(logo|photo|avatar|thumbnail|image)$/i;

function scoreImageFieldName(fieldName: string): number {
  if (/^logo$/i.test(fieldName)) {
    return 0;
  }
  if (PREFERRED_IMAGE_NAME_PATTERN.test(fieldName)) {
    return 1;
  }
  if (/logo/i.test(fieldName)) {
    return 2;
  }
  if (/image|photo|avatar|thumbnail/i.test(fieldName)) {
    return 3;
  }
  return 4;
}

function listImageFieldCandidates(
  definition: EntityCatalogEntry,
): readonly string[] {
  const viewImagePaths = (definition.ui.views ?? [])
    .map((view) =>
      view.type === "expandableTable" && typeof view.imageFieldPath === "string"
        ? view.imageFieldPath.trim()
        : "",
    )
    .filter((path) => path.length > 0);

  const typedImageFields = Object.entries(definition.fields)
    .filter(([, field]) => field.type === "image")
    .map(([name]) => name)
    .sort(
      (left, right) =>
        scoreImageFieldName(left) - scoreImageFieldName(right) ||
        left.localeCompare(right),
    );

  const ordered: string[] = [];
  for (const name of [...typedImageFields, ...viewImagePaths]) {
    if (!name || ordered.includes(name)) {
      continue;
    }
    ordered.push(name);
  }
  return ordered;
}

/** Prefer logo/image fields that already have a resolvable URL on the record. */
export function resolveGlobalSearchHitImageUrl(options: {
  readonly record: Record<string, unknown>;
  readonly definition?: EntityCatalogEntry;
}): string | null {
  const { record, definition } = options;
  if (!definition) {
    return null;
  }

  for (const fieldName of listImageFieldCandidates(definition)) {
    const url = readEntityLayoutImageSourceUrl(record[fieldName]);
    if (url) {
      return url;
    }
  }

  return null;
}
