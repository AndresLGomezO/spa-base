import {
  computeReconciliationPlan,
  harvestTenantMessages,
  localeCodeSchema,
  type LocalePack,
  type ReconciliationPlan,
} from "@repo/locale-packs";
import { z } from "zod";

import type { LocalePackRuntimeContext } from "./locale-pack-runtime-context.js";

export const reconcileLocalePacksBodySchema = z.object({
  ensureLocales: z.array(localeCodeSchema).optional(),
});

type ReconcileLocalePacksBody = z.infer<typeof reconcileLocalePacksBodySchema>;

interface ReconcileLocalePacksResult {
  readonly counts: ReconciliationPlan["counts"];
  readonly perLocale: ReconciliationPlan["perLocale"];
  readonly harvestedKeyCount: number;
  readonly items: readonly LocalePack[];
}

export async function reconcileLocalePacks(
  localePackRuntime: LocalePackRuntimeContext,
  tenantId: string,
  body: ReconcileLocalePacksBody = {},
): Promise<ReconcileLocalePacksResult> {
  const tenant = await localePackRuntime.tenantRepository.getById(tenantId);
  const defaultLocale = tenant?.defaultLocale?.trim() || "en";

  const harvested = await harvestTenantMessages(
    localePackRuntime.harvestRepositories,
    tenantId,
  );
  const existing = await localePackRuntime.repository.list(tenantId);
  const plan = computeReconciliationPlan({
    harvested,
    existing,
    defaultLocale,
    extraLocales: body.ensureLocales,
  });

  const existingByLocale = new Map(
    existing.map((pack) => [pack.locale, pack] as const),
  );

  for (const locale of plan.locales) {
    const nextMessages = plan.nextMessages[locale] ?? {};
    const current = existingByLocale.get(locale);
    if (current) {
      await localePackRuntime.repository.update(tenantId, current.id, {
        messages: nextMessages,
      });
    } else {
      await localePackRuntime.repository.create(tenantId, {
        locale,
        messages: nextMessages,
      });
    }
  }

  const items = await localePackRuntime.repository.list(tenantId);
  return {
    counts: plan.counts,
    perLocale: plan.perLocale,
    harvestedKeyCount: plan.harvestedKeys.length,
    items,
  };
}
