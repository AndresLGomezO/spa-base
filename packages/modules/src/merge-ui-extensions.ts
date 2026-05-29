import type { EntityUIConfig } from "@repo/entities";

import type { EntityUIExtension } from "./types.js";

export function mergeUiExtensions(
  base: EntityUIConfig,
  extensions: readonly EntityUIExtension[],
): EntityUIConfig {
  if (extensions.length === 0) {
    return base;
  }

  let views = [...base.views];
  let fields = base.fields ? { ...base.fields } : undefined;
  let nav = base.nav ? { ...base.nav } : undefined;

  for (const extension of extensions) {
    if (extension.views?.length) {
      views = [...views, ...extension.views];
    }
    if (extension.fields) {
      fields = { ...fields, ...extension.fields };
    }
    if (extension.nav) {
      const currentNav = nav ?? base.nav;
      if (currentNav) {
        nav = {
          ...currentNav,
          ...extension.nav,
          label: extension.nav.label ?? currentNav.label,
        };
      }
    }
  }

  return {
    ...base,
    views,
    ...(fields ? { fields } : {}),
    ...(nav ? { nav } : {}),
  };
}
