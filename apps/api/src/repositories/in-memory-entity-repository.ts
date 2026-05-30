import type {
  FindByFieldParams,
  ListParams,
  PaginatedResult,
  TenantScopedEntityRepository,
} from "@repo/firestore-converters";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function storageKey(tenantId: string, id: string): string {
  return `${tenantId}:${id}`;
}

function normalizeLimit(limit: number | undefined): number {
  if (limit === undefined) {
    return DEFAULT_LIMIT;
  }
  if (!Number.isFinite(limit) || limit < 1) {
    return DEFAULT_LIMIT;
  }
  return Math.min(Math.floor(limit), MAX_LIMIT);
}

function filterTenantRecords<
  TRecord extends { readonly id: string; readonly tenantId: string },
>(store: Map<string, TRecord>, tenantId: string): TRecord[] {
  return [...store.values()]
    .filter((record) => record.tenantId === tenantId)
    .sort((left, right) => left.id.localeCompare(right.id));
}

function paginateRecords<TRecord extends { readonly id: string }>(
  records: readonly TRecord[],
  limit: number,
  cursor?: string,
): PaginatedResult<TRecord> {
  let startIndex = 0;
  if (cursor) {
    const cursorIndex = records.findIndex((record) => record.id === cursor);
    startIndex = cursorIndex >= 0 ? cursorIndex + 1 : 0;
  }

  const page = records.slice(startIndex, startIndex + limit);
  const hasMore = startIndex + limit < records.length;
  const nextCursor =
    hasMore && page.length > 0 ? page[page.length - 1]!.id : null;

  return {
    items: page,
    nextCursor,
    totalCount: records.length,
  };
}

interface InMemoryEntityRepositoryOptions<
  TRecord extends { readonly id: string; readonly tenantId: string },
> {
  readonly initialData?: readonly TRecord[];
  readonly store?: Map<string, TRecord>;
}

export function createInMemoryEntityRepository<
  TRecord extends { readonly id: string; readonly tenantId: string },
  TUpdate = Partial<TRecord>,
>(
  options: InMemoryEntityRepositoryOptions<TRecord> = {},
): TenantScopedEntityRepository<TRecord, TUpdate> {
  const store = options.store ?? new Map<string, TRecord>();

  for (const record of options.initialData ?? []) {
    store.set(storageKey(record.tenantId, record.id), record);
  }

  return {
    async create(tenantId: string, record: TRecord): Promise<TRecord> {
      if (record.tenantId !== tenantId) {
        throw new Error("Record tenantId does not match authenticated tenant.");
      }

      const key = storageKey(tenantId, record.id);
      if (store.has(key)) {
        throw new Error(`Record already exists: ${record.id}`);
      }

      store.set(key, record);
      return record;
    },

    async findAll(params: ListParams): Promise<PaginatedResult<TRecord>> {
      const limit = normalizeLimit(params.limit);
      const tenantRecords = filterTenantRecords(store, params.tenantId);
      return paginateRecords(tenantRecords, limit, params.cursor);
    },

    async findByField(
      params: FindByFieldParams,
    ): Promise<PaginatedResult<TRecord>> {
      const limit = normalizeLimit(params.limit);
      const tenantRecords = filterTenantRecords(store, params.tenantId).filter(
        (record) =>
          String((record as Record<string, unknown>)[params.field]) ===
          params.value,
      );
      return paginateRecords(tenantRecords, limit, params.cursor);
    },

    async findById(id: string, tenantId: string): Promise<TRecord | null> {
      const record = store.get(storageKey(tenantId, id));
      return record ?? null;
    },

    async update(
      id: string,
      tenantId: string,
      data: TUpdate,
    ): Promise<TRecord | null> {
      const key = storageKey(tenantId, id);
      const existing = store.get(key);
      if (!existing) {
        return null;
      }

      const updated = {
        ...existing,
        ...(data as Record<string, unknown>),
        id: existing.id,
        tenantId: existing.tenantId,
      } as TRecord;

      store.set(key, updated);
      return updated;
    },

    async delete(id: string, tenantId: string): Promise<boolean> {
      const key = storageKey(tenantId, id);
      return store.delete(key);
    },
  };
}
