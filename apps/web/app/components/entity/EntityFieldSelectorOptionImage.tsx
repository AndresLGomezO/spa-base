import type { SerializableEntityDefinition } from "@repo/entities";
import { CardFieldImage } from "@repo/ui";

import type { EntityCatalogEntry } from "../../entities/entity-catalog";
import { EntityLayoutImageField } from "./EntityLayoutImageField";
import { ENTITY_LAYOUT_IMAGE_PLACEHOLDER_SRC } from "./entity-layout-image-placeholder";

interface EntityFieldSelectorOptionImageProps {
  readonly record: Record<string, unknown> | undefined;
  readonly imageFieldPath: string | undefined;
  readonly targetDefinition: SerializableEntityDefinition | undefined;
  readonly getDefinition?: (
    entityName: string,
  ) => EntityCatalogEntry | undefined;
  readonly className?: string;
  readonly imageSize?: number;
}

export function EntityFieldSelectorOptionImage({
  record,
  imageFieldPath,
  targetDefinition,
  getDefinition,
  className,
  imageSize,
}: EntityFieldSelectorOptionImageProps) {
  if (!record || !imageFieldPath || !targetDefinition) {
    return (
      <CardFieldImage
        src={ENTITY_LAYOUT_IMAGE_PLACEHOLDER_SRC}
        alt=""
        className={className}
        sizePx={imageSize}
      />
    );
  }

  return (
    <EntityLayoutImageField
      item={record}
      fieldPath={imageFieldPath}
      rawValue={record[imageFieldPath]}
      definition={targetDefinition}
      getDefinition={getDefinition}
      usePreviewPlaceholder
      className={className}
      imageSize={imageSize}
    />
  );
}
