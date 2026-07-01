import { normalizeEntityViews, type ViewConfig } from "@repo/entities";
import type {
  CreateCustomViewInput,
  CustomViewDefinitionFormData,
  CustomViewRecord,
  CustomViewUIConfig,
  PatchCustomViewInput,
} from "@repo/custom-views/browser";

type ApiCustomViewUi = NonNullable<CreateCustomViewInput["ui"]>;
type PortableCustomViewUi = NonNullable<CustomViewDefinitionFormData["ui"]>;

function normalizeViews(
  views: readonly ViewConfig[] | readonly unknown[],
): readonly ViewConfig[] {
  return normalizeEntityViews(views as readonly ViewConfig[]);
}

export function toApiCustomViewUi(ui: CustomViewUIConfig): ApiCustomViewUi {
  return {
    ...ui,
    views: [...normalizeViews(ui.views)],
  } as ApiCustomViewUi;
}

export function toApiCustomViewUiPatch(
  ui: CustomViewUIConfig,
): NonNullable<PatchCustomViewInput["ui"]> {
  return toApiCustomViewUi(ui);
}

export function toPortableCustomViewUi(
  ui: CustomViewUIConfig,
): PortableCustomViewUi {
  return toApiCustomViewUi(ui);
}

export function toCustomViewUIConfig(
  ui: ApiCustomViewUi | PortableCustomViewUi | CustomViewRecord["ui"],
): CustomViewUIConfig {
  return {
    ...ui,
    views: normalizeViews(ui.views),
  } as CustomViewUIConfig;
}

export function optionalCustomViewUIConfig(
  ui:
    | CustomViewUIConfig
    | ApiCustomViewUi
    | PortableCustomViewUi
    | CustomViewRecord["ui"]
    | undefined,
): CustomViewUIConfig | undefined {
  if (!ui) {
    return undefined;
  }

  return {
    ...ui,
    views: normalizeViews(ui.views),
  } as CustomViewUIConfig;
}
