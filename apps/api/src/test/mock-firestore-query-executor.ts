import { vi } from "vitest";

import { createInMemoryEntityQueryExecutor } from "../repositories/in-memory-entity-query-executor.js";

export const mockCreateFirestoreEntityQueryExecutor = vi.fn(() =>
  createInMemoryEntityQueryExecutor(() => new Map()),
);
