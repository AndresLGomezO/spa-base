import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "@repo/ui";
import { ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS } from "@repo/entities";

import { useAnyPermission } from "../../auth/useAnyPermission";
import {
  createUiBuilderPreset,
  listUiBuilderPresets,
} from "../../lib/api-client";
import {
  layoutPresetInsertLabels,
  layoutPresetLabels,
} from "./layout-preset-labels";

export function useUiBuilderPresetStore(sourceEntityName: string) {
  const { t } = useTranslation("common");
  const queryClient = useQueryClient();
  const canApplyPresets = useAnyPermission(
    ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS,
  );

  const presetsQuery = useQuery({
    queryKey: ["ui-builder-presets"],
    queryFn: async () => {
      const result = await listUiBuilderPresets();
      return result.items;
    },
  });

  return {
    presets: presetsQuery.data ?? [],
    canApplyPresets,
    presetLabels: layoutPresetLabels(t),
    presetInsertLabels: layoutPresetInsertLabels(t),
    sourceEntityName,
    onCreatePreset: async (
      input: Parameters<typeof createUiBuilderPreset>[0],
    ) => {
      await createUiBuilderPreset(input);
      await queryClient.invalidateQueries({ queryKey: ["ui-builder-presets"] });
      toast.success(t("designLayout.presets.savedToStore"));
    },
  };
}
