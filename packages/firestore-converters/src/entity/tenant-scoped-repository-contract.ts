export interface FindByFieldParams {
  readonly tenantId: string;
  readonly field: string;
  /** Firestore equality is typed; pass number/boolean for those fields. */
  readonly value: string | number | boolean;
  readonly limit?: number;
  readonly cursor?: string;
}

export interface ListParams {
  readonly tenantId: string;
  readonly limit?: number;
  readonly cursor?: string;
}

export interface PaginatedResult<T> {
  readonly items: readonly T[];
  readonly nextCursor: string | null;
  readonly totalCount: number;
}

export interface EntityCreateOptions {
  readonly skipExistsCheck?: boolean;
}

export interface TenantScopedEntityRepository<
  TRecord extends { readonly id: string; readonly tenantId: string },
  TUpdate = Partial<TRecord>,
> {
  create(
    tenantId: string,
    record: TRecord,
    options?: EntityCreateOptions,
  ): Promise<TRecord>;
  createMany(
    tenantId: string,
    records: readonly TRecord[],
  ): Promise<readonly TRecord[]>;
  findAll(params: ListParams): Promise<PaginatedResult<TRecord>>;
  findByField(params: FindByFieldParams): Promise<PaginatedResult<TRecord>>;
  findById(id: string, tenantId: string): Promise<TRecord | null>;
  update(id: string, tenantId: string, data: TUpdate): Promise<TRecord | null>;
  delete(id: string, tenantId: string): Promise<boolean>;
}
