import {
  AI_RECORD_SUMMARY_TEMPLATE_FRAGMENT_KEY,
  aiRecordSummaryTemplateSchema,
  parseAiRecordSummaryTemplate,
  type AiRecordSummaryTemplate,
} from "../storage/ai-record-summary-template.schema.js";
import type { TenantAiContextRepository } from "../storage/tenant-ai-context.schema.js";
import { buildTenantAiContextDocId, hashSourceValue } from "../utils/hash.js";

export async function getAiRecordSummaryTemplate(
  repository: TenantAiContextRepository,
  tenantId: string,
  entityName: string,
): Promise<AiRecordSummaryTemplate | null> {
  const record = await repository.get(
    tenantId,
    buildTenantAiContextDocId("entity", entityName),
  );
  const fragment = record?.fragments[AI_RECORD_SUMMARY_TEMPLATE_FRAGMENT_KEY];
  return fragment ? parseAiRecordSummaryTemplate(fragment) : null;
}

export async function upsertAiRecordSummaryTemplate(
  repository: TenantAiContextRepository,
  tenantId: string,
  entityName: string,
  template: AiRecordSummaryTemplate,
): Promise<AiRecordSummaryTemplate> {
  const parsed = aiRecordSummaryTemplateSchema.parse(template);
  const id = buildTenantAiContextDocId("entity", entityName);
  const existing = await repository.get(tenantId, id);
  const serialized = JSON.stringify(parsed);

  await repository.upsert({
    id,
    tenantId,
    kind: "entity",
    scopeKey: entityName,
    sourceHash:
      existing?.sourceHash ??
      hashSourceValue({
        [AI_RECORD_SUMMARY_TEMPLATE_FRAGMENT_KEY]: parsed,
      }),
    fragments: {
      ...existing?.fragments,
      [AI_RECORD_SUMMARY_TEMPLATE_FRAGMENT_KEY]: serialized,
    },
    ...(existing?.assembled ? { assembled: existing.assembled } : {}),
    updatedAt: new Date().toISOString(),
  });

  return parsed;
}

/**
 * Remove the template fragment. Leaves other entity AI context fragments intact.
 * Deletes the doc only when no other fragments remain.
 */
export async function deleteAiRecordSummaryTemplate(
  repository: TenantAiContextRepository,
  tenantId: string,
  entityName: string,
): Promise<boolean> {
  const id = buildTenantAiContextDocId("entity", entityName);
  const existing = await repository.get(tenantId, id);
  if (!existing?.fragments[AI_RECORD_SUMMARY_TEMPLATE_FRAGMENT_KEY]) {
    return false;
  }

  const rest = { ...existing.fragments };
  delete rest[AI_RECORD_SUMMARY_TEMPLATE_FRAGMENT_KEY];

  if (Object.keys(rest).length === 0) {
    await repository.delete(tenantId, id);
    return true;
  }

  await repository.upsert({
    ...existing,
    fragments: rest,
    updatedAt: new Date().toISOString(),
  });
  return true;
}

export async function listAiRecordSummaryTemplates(
  repository: TenantAiContextRepository,
  tenantId: string,
  entityNames: readonly string[],
): Promise<
  readonly {
    readonly entityName: string;
    readonly template: AiRecordSummaryTemplate;
  }[]
> {
  const items: {
    readonly entityName: string;
    readonly template: AiRecordSummaryTemplate;
  }[] = [];
  for (const entityName of entityNames) {
    const template = await getAiRecordSummaryTemplate(
      repository,
      tenantId,
      entityName,
    );
    if (template) {
      items.push({ entityName, template });
    }
  }
  return items;
}
