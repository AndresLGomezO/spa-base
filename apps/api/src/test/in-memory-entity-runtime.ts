import type { EntityQueryExecutor } from "@repo/firestore-converters";
import type { CustomerRecord, OrderRecord } from "@repo/shared-types";

import { createInMemoryEntityQueryExecutor } from "../repositories/in-memory-entity-query-executor.js";
import { createInMemoryEntityRepository } from "../repositories/in-memory-entity-repository.js";

function createInMemoryEntityRuntime<
  TRecord extends { readonly id: string; readonly tenantId: string },
>(): {
  readonly store: Map<string, TRecord>;
  readonly repository: ReturnType<
    typeof createInMemoryEntityRepository<TRecord>
  >;
  readonly queryExecutor: EntityQueryExecutor;
} {
  const store = new Map<string, TRecord>();
  const repository = createInMemoryEntityRepository<TRecord>({ store });
  const queryExecutor = createInMemoryEntityQueryExecutor(
    () => store as unknown as Map<string, Record<string, unknown>>,
  );

  return { store, repository, queryExecutor };
}

export function createInMemoryCrudRuntime(): {
  readonly repositories: {
    readonly customer: ReturnType<
      typeof createInMemoryEntityRepository<CustomerRecord>
    >;
    readonly order: ReturnType<
      typeof createInMemoryEntityRepository<OrderRecord>
    >;
  };
  readonly queryExecutors: {
    readonly customer: EntityQueryExecutor;
    readonly order: EntityQueryExecutor;
  };
} {
  const customer = createInMemoryEntityRuntime<CustomerRecord>();
  const order = createInMemoryEntityRuntime<OrderRecord>();

  return {
    repositories: {
      customer: customer.repository,
      order: order.repository,
    },
    queryExecutors: {
      customer: customer.queryExecutor,
      order: order.queryExecutor,
    },
  };
}
