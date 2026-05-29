import type {
  CreateEntityDefinitionInput,
  EntityDefinitionRecord,
  PatchEntityDefinitionInput,
} from "@repo/dynamic-entities";

export interface EntityDefinitionRepository {
  list(tenantId: string): Promise<readonly EntityDefinitionRecord[]>;
  getById(tenantId: string, id: string): Promise<EntityDefinitionRecord | null>;
  getByName(
    tenantId: string,
    name: string,
  ): Promise<EntityDefinitionRecord | null>;
  create(
    tenantId: string,
    input: CreateEntityDefinitionInput,
  ): Promise<EntityDefinitionRecord>;
  update(
    tenantId: string,
    id: string,
    input: PatchEntityDefinitionInput,
  ): Promise<EntityDefinitionRecord>;
}
