import { DynamicEntityError } from "./define-entity-from-record.js";

export interface NavCategoryReader {
  getById(tenantId: string, id: string): Promise<{ id: string } | null>;
}

export async function assertNavCategoryExists(
  repository: NavCategoryReader,
  tenantId: string,
  navCategoryId: string | null | undefined,
): Promise<void> {
  if (navCategoryId === undefined || navCategoryId === null) {
    return;
  }

  const trimmed = navCategoryId.trim();
  if (trimmed.length === 0) {
    return;
  }

  const category = await repository.getById(tenantId, trimmed);
  if (!category) {
    throw new DynamicEntityError(
      `Navigation category "${trimmed}" does not exist.`,
    );
  }
}
