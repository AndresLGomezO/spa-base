import type { EntityQueryExecutor } from "@repo/firestore-converters";
import type { OrganizationRecord, ProjectRecord } from "@repo/shared-types";

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
      typeof createInMemoryEntityRepository<OrganizationRecord | ProjectRecord>
    >
  >;
  readonly queryExecutors: Record<string, EntityQueryExecutor>;
} {
  const organization = createInMemoryEntityRuntime<OrganizationRecord>();
  const project = createInMemoryEntityRuntime<ProjectRecord>();

  return {
    repositories: {
      organization: organization.repository,
      project: project.repository,
    },
    queryExecutors: {
      organization: organization.queryExecutor,
      project: project.queryExecutor,
    },
  };
}
