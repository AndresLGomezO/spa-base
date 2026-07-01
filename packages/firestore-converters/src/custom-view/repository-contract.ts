import type {
  CreateCustomViewInput,
  CustomViewRecord,
  PatchCustomViewInput,
} from "@repo/custom-views";

export interface CustomViewRepository {
  list(tenantId: string): Promise<readonly CustomViewRecord[]>;
  listActive(tenantId: string): Promise<readonly CustomViewRecord[]>;
  getById(tenantId: string, id: string): Promise<CustomViewRecord | null>;
  getByViewId(
    tenantId: string,
    viewId: string,
  ): Promise<CustomViewRecord | null>;
  create(
    tenantId: string,
    input: CreateCustomViewInput & { readonly sourceEntity: string },
  ): Promise<CustomViewRecord>;
  update(
    tenantId: string,
    id: string,
    input: PatchCustomViewInput & { readonly sourceEntity?: string },
  ): Promise<CustomViewRecord>;
  delete(tenantId: string, id: string): Promise<void>;
  countByQueryDefinitionId(
    tenantId: string,
    entityQueryDefinitionId: string,
  ): Promise<number>;
}
