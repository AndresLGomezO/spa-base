import {
  computeLocalePackCatalogReplacePlan,
  type CreateLocalePackInput,
  type LocalePack,
  type LocalePacksCatalogEnvelope,
  type PatchLocalePackInput,
} from "@repo/locale-packs";

import type { LocalePackRuntimeContext } from "./locale-pack-runtime-context.js";

export class LocalePackCatalogReplaceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LocalePackCatalogReplaceError";
  }
}

interface ReplaceLocalePacksCatalogResult {
  readonly counts: {
    readonly created: number;
    readonly updated: number;
    readonly deleted: number;
  };
  readonly items: readonly LocalePack[];
}

function createPatchFromCreateInput(
  imported: CreateLocalePackInput,
): PatchLocalePackInput {
  return {
    locale: imported.locale,
    messages: imported.messages,
  };
}

export async function replaceLocalePacksCatalog(
  localePackRuntime: LocalePackRuntimeContext,
  tenantId: string,
  catalog: LocalePacksCatalogEnvelope,
): Promise<ReplaceLocalePacksCatalogResult> {
  const existing = await localePackRuntime.repository.list(tenantId);
  const plan = computeLocalePackCatalogReplacePlan({
    existing,
    imported: catalog.localePacks,
  });

  for (const record of plan.toDelete) {
    await localePackRuntime.repository.delete(tenantId, record.id);
  }

  for (const { existing: current, input } of plan.toUpdate) {
    await localePackRuntime.repository.update(
      tenantId,
      current.id,
      createPatchFromCreateInput(input),
    );
  }

  for (const input of plan.toCreate) {
    await localePackRuntime.repository.create(tenantId, input);
  }

  const items = await localePackRuntime.repository.list(tenantId);
  return {
    counts: plan.counts,
    items,
  };
}
