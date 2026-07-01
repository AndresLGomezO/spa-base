import type {
  CreateEntityCategoryInput,
  EntityCategoryRecord,
  PatchEntityCategoryInput,
} from "@repo/entity-categories";

export interface EntityCategoryRepository {
  list(tenantId: string): Promise<readonly EntityCategoryRecord[]>;
  getById(tenantId: string, id: string): Promise<EntityCategoryRecord | null>;
  create(
    tenantId: string,
    input: CreateEntityCategoryInput,
  ): Promise<EntityCategoryRecord>;
  createWithId(
    tenantId: string,
    id: string,
    input: CreateEntityCategoryInput,
  ): Promise<EntityCategoryRecord>;
  update(
    tenantId: string,
    id: string,
    input: PatchEntityCategoryInput,
  ): Promise<EntityCategoryRecord>;
  delete(tenantId: string, id: string): Promise<void>;
}
