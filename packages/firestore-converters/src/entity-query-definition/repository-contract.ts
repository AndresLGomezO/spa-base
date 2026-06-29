import type {
  CreateEntityQueryDefinitionInput,
  EntityQueryDefinitionRecord,
  PatchEntityQueryDefinitionInput,
} from "@repo/entity-queries";

export interface EntityQueryDefinitionRepository {
  list(tenantId: string): Promise<readonly EntityQueryDefinitionRecord[]>;
  listActive(tenantId: string): Promise<readonly EntityQueryDefinitionRecord[]>;
  getById(
    tenantId: string,
    id: string,
  ): Promise<EntityQueryDefinitionRecord | null>;
  create(
    tenantId: string,
    input: CreateEntityQueryDefinitionInput,
  ): Promise<EntityQueryDefinitionRecord>;
  update(
    tenantId: string,
    id: string,
    input: PatchEntityQueryDefinitionInput,
  ): Promise<EntityQueryDefinitionRecord>;
  delete(tenantId: string, id: string): Promise<void>;
}
