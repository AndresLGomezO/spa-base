import {
  buildDefaultUiForNewDefinition,
  syncEntityDefinitionUiWithFields,
} from "@repo/dynamic-entities";
import type { EntityUIConfig } from "@repo/entities";

import type {
  EntityDefinitionRecord,
  FieldDefinitionInput,
} from "../../lib/api-client";

export function buildEntityDefinitionUiForSave(input: {
  readonly record: EntityDefinitionRecord | null;
  readonly label: string;
  readonly fields: readonly FieldDefinitionInput[];
  readonly navIcon: string;
}): EntityUIConfig | undefined {
  const trimmedIcon = input.navIcon.trim();
  const label = input.label.trim();

  if (input.record?.ui) {
    const existingNav = input.record.ui.nav;
    const { icon: _removed, ...navWithoutIcon } = existingNav ?? { label };
    void _removed;

    return syncEntityDefinitionUiWithFields({
      ui: {
        ...input.record.ui,
        nav: {
          ...navWithoutIcon,
          label,
          ...(trimmedIcon ? { icon: trimmedIcon } : {}),
        },
      },
      label,
      fields: input.fields,
    });
  }

  if (!trimmedIcon) {
    return undefined;
  }

  return buildDefaultUiForNewDefinition({
    label,
    fields: input.fields,
    navIcon: trimmedIcon,
  });
}
