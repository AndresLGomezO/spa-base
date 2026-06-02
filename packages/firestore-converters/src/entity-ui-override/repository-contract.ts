import type {
  EntityUiOverrideRecord,
  PutEntityUiOverrideInput,
} from "@repo/entities";

export interface EntityUiOverrideRepository {
  get(
    tenantId: string,
    entityName: string,
  ): Promise<EntityUiOverrideRecord | null>;
  put(
    tenantId: string,
    entityName: string,
    input: PutEntityUiOverrideInput,
  ): Promise<EntityUiOverrideRecord>;
  list(tenantId: string): Promise<readonly EntityUiOverrideRecord[]>;
}
