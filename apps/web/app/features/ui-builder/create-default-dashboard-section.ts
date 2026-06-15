import type { DashboardSectionDefinition } from "@repo/entities";
import {
  createEmptyLayout,
  createLayoutId,
  ensureContainerRoot,
} from "@repo/ui-builder-core";

export function createDefaultDashboardSection(
  name: string,
): DashboardSectionDefinition {
  return {
    id: createLayoutId("section"),
    name,
    layout: ensureContainerRoot(createEmptyLayout(1)),
  };
}
