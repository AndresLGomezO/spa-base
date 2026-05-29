export interface ListParams {
  readonly tenantId: string;
  readonly limit?: number;
  readonly cursor?: string;
}

export interface PaginatedResult<T> {
  readonly items: readonly T[];
  readonly nextCursor: string | null;
}

export interface TenantScopedEntityRepository<
  TRecord extends { readonly id: string; readonly tenantId: string },
  TUpdate = Partial<TRecord>,
> {
  create(tenantId: string, record: TRecord): Promise<TRecord>;
  findAll(params: ListParams): Promise<PaginatedResult<TRecord>>;
  findById(id: string, tenantId: string): Promise<TRecord | null>;
  update(id: string, tenantId: string, data: TUpdate): Promise<TRecord | null>;
  delete(id: string, tenantId: string): Promise<boolean>;
}
