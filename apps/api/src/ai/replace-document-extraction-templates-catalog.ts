import {
  computeDocumentExtractionTemplateCatalogReplacePlan,
  type CreateDocumentExtractionTemplateInput,
  type DocumentExtractionTemplateRecord,
  type DocumentExtractionTemplatesCatalogEnvelope,
  type PatchDocumentExtractionTemplateInput,
} from "@repo/ai-context";

import type { DocumentExtractionTemplateRepository } from "@repo/firestore-converters";

interface ReplaceDocumentExtractionTemplatesCatalogDeps {
  readonly documentExtractionTemplateRepository: DocumentExtractionTemplateRepository;
}

interface ReplaceDocumentExtractionTemplatesCatalogResult {
  readonly counts: {
    readonly created: number;
    readonly updated: number;
    readonly deleted: number;
  };
  readonly items: readonly DocumentExtractionTemplateRecord[];
}

function createPatchFromCreateInput(
  imported: CreateDocumentExtractionTemplateInput,
): PatchDocumentExtractionTemplateInput {
  const { id: _id, ...patch } = imported;
  void _id;
  return patch;
}

export async function replaceDocumentExtractionTemplatesCatalog(
  deps: ReplaceDocumentExtractionTemplatesCatalogDeps,
  tenantId: string,
  catalog: DocumentExtractionTemplatesCatalogEnvelope,
): Promise<ReplaceDocumentExtractionTemplatesCatalogResult> {
  const existing =
    await deps.documentExtractionTemplateRepository.list(tenantId);
  const plan = computeDocumentExtractionTemplateCatalogReplacePlan({
    existing,
    imported: catalog.documentExtractionTemplates,
  });

  for (const record of plan.toDelete) {
    await deps.documentExtractionTemplateRepository.delete(tenantId, record.id);
  }

  for (const { existing: current, input } of plan.toUpdate) {
    await deps.documentExtractionTemplateRepository.update(
      tenantId,
      current.id,
      createPatchFromCreateInput(input),
    );
  }

  for (const input of plan.toCreate) {
    await deps.documentExtractionTemplateRepository.create(tenantId, input);
  }

  const items = await deps.documentExtractionTemplateRepository.list(tenantId);

  return {
    counts: plan.counts,
    items,
  };
}
