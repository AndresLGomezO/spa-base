import { getAllEntities } from "@repo/entities";
import type { EntityQueryExecutor } from "@repo/firestore-converters";

import { platformApp } from "@app/platform/app.config.js";
import { bootstrapPlatformApp } from "@app/platform/bootstrap.js";
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
  readonly repositories: Record<
    string,
    ReturnType<
      typeof createInMemoryEntityRepository<{
        readonly id: string;
        readonly tenantId: string;
      }>
    >
  >;
  readonly queryExecutors: Record<string, EntityQueryExecutor>;
} {
  bootstrapPlatformApp(platformApp);

  const repositories: Record<
    string,
    ReturnType<
      typeof createInMemoryEntityRepository<{
        readonly id: string;
        readonly tenantId: string;
      }>
    >
  > = {};
  const queryExecutors: Record<string, EntityQueryExecutor> = {};

  for (const entity of getAllEntities()) {
    const runtime = createInMemoryEntityRuntime();
    repositories[entity.name] = runtime.repository;
    queryExecutors[entity.name] = runtime.queryExecutor;
  }

  return { repositories, queryExecutors };
}
