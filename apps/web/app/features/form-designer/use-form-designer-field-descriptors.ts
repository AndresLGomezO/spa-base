import {
  entityCardViewAdapter,
  entityFormFieldAdapter,
} from "@repo/ui-builder-react";
import type { FieldDescriptor } from "@repo/ui-builder-react";
import { useMemo } from "react";

import {
  useEntityCatalog,
  useEntityDefinition,
} from "../../entities/entity-catalog-context";
import type { EntityName } from "../../entities/entity-catalog";

export function useFormDesignerFieldDescriptors(entityName: EntityName): {
  readonly fieldDescriptors: readonly FieldDescriptor[];
  readonly displayFieldDescriptors: readonly FieldDescriptor[];
} {
  const { getDefinition, items: catalog } = useEntityCatalog();
  const definition = useEntityDefinition(entityName);

  const fieldDescriptors = useMemo(
    () => entityFormFieldAdapter(definition).fieldDescriptors,
    [definition],
  );

  const displayFieldDescriptors = useMemo(
    () =>
      entityCardViewAdapter(definition, getDefinition, catalog)
        .fieldDescriptors,
    [catalog, definition, getDefinition],
  );

  return { fieldDescriptors, displayFieldDescriptors };
}
