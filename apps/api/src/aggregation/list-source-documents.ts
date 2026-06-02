import type { SourceDocumentSnapshot } from "@repo/aggregation-engine";
import type { EntityRuntimeContext } from "../entities/entity-runtime-context.js";

const SOURCE_DOCUMENT_PAGE_SIZE = 100;

export async function listSourceDocumentsForMetric(
  entityRuntime: EntityRuntimeContext,
  tenantId: string,
  sourceModel: string,
): Promise<readonly SourceDocumentSnapshot[]> {
  const repository = entityRuntime.getRepository(tenantId, sourceModel);
  if (!repository) {
    throw new Error(`Unknown source model "${sourceModel}".`);
  }

  const documents: SourceDocumentSnapshot[] = [];
  let cursor: string | undefined;

  do {
    const page = await repository.findAll({
      tenantId,
      limit: SOURCE_DOCUMENT_PAGE_SIZE,
      cursor,
    });

    for (const item of page.items) {
      documents.push({
        documentId: item.id,
        record: item as Record<string, unknown>,
      });
    }

    cursor = page.nextCursor ?? undefined;
  } while (cursor);

  return documents;
}
