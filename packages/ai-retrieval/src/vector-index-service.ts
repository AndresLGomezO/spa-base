import type { VectorIndexClient } from "./types.js";

const DEFAULT_DIMENSIONS = 768;
const DEFAULT_TOP_K = 10;

function assertIdPart(value: string, name: string): void {
  if (value.length === 0 || value.includes(":")) {
    throw new Error(`${name} must be non-empty and must not contain ":".`);
  }
}

function assertEmbedding(
  embedding: readonly number[],
  dimensions: number,
): void {
  if (
    embedding.length !== dimensions ||
    embedding.some((value) => !Number.isFinite(value))
  ) {
    throw new Error(
      `Expected ${dimensions} finite embedding values, received ${embedding.length}.`,
    );
  }
}

export function buildVectorDatapointId(
  tenantId: string,
  entityName: string,
  recordId: string,
): string {
  assertIdPart(tenantId, "tenantId");
  assertIdPart(entityName, "entityName");
  assertIdPart(recordId, "recordId");
  return `${tenantId}:${entityName}:${recordId}`;
}

export function parseVectorDatapointId(
  id: string,
): { tenantId: string; entityName: string; recordId: string } | null {
  const parts = id.split(":");
  if (parts.length !== 3 || parts.some((part) => part.length === 0)) {
    return null;
  }
  return {
    tenantId: parts[0]!,
    entityName: parts[1]!,
    recordId: parts[2]!,
  };
}

export class VectorIndexService {
  readonly #client: VectorIndexClient;
  readonly #dimensions: number;

  constructor(
    client: VectorIndexClient,
    options?: { readonly dimensions?: number },
  ) {
    this.#client = client;
    this.#dimensions = options?.dimensions ?? DEFAULT_DIMENSIONS;
    if (!Number.isInteger(this.#dimensions) || this.#dimensions <= 0) {
      throw new Error("Vector dimensions must be a positive integer.");
    }
  }

  async upsertRecord(input: {
    readonly tenantId: string;
    readonly entityName: string;
    readonly recordId: string;
    readonly embedding: readonly number[];
    readonly accessUserIds?: readonly string[];
    readonly tenantWideRead?: boolean;
  }): Promise<void> {
    assertEmbedding(input.embedding, this.#dimensions);
    await this.#client.upsert([
      {
        id: buildVectorDatapointId(
          input.tenantId,
          input.entityName,
          input.recordId,
        ),
        embedding: input.embedding,
        restricts: {
          tenantId: input.tenantId,
          entityName: input.entityName,
          accessUserIds: [...new Set(input.accessUserIds ?? [])],
          tenantWideRead: input.tenantWideRead ?? false,
        },
      },
    ]);
  }

  async removeRecord(input: {
    readonly tenantId: string;
    readonly entityName: string;
    readonly recordId: string;
  }): Promise<void> {
    await this.#client.remove([
      buildVectorDatapointId(input.tenantId, input.entityName, input.recordId),
    ]);
  }

  async queryTopK(input: {
    readonly tenantId: string;
    readonly userId: string;
    readonly entityName?: string;
    readonly embedding: readonly number[];
    readonly topK?: number;
    readonly minScore?: number;
  }): Promise<
    readonly {
      tenantId: string;
      entityName: string;
      recordId: string;
      score: number;
    }[]
  > {
    assertEmbedding(input.embedding, this.#dimensions);
    const topK = input.topK ?? DEFAULT_TOP_K;
    if (!Number.isInteger(topK) || topK <= 0) {
      throw new Error("topK must be a positive integer.");
    }

    const neighbors = await this.#client.findNeighbors({
      embedding: input.embedding,
      topK,
      restricts: {
        tenantId: input.tenantId,
        ...(input.entityName ? { entityName: input.entityName } : {}),
        userId: input.userId,
      },
    });

    return neighbors.flatMap((neighbor) => {
      const parsed = parseVectorDatapointId(neighbor.id);
      if (
        !parsed ||
        parsed.tenantId !== input.tenantId ||
        neighbor.score < (input.minScore ?? -1)
      ) {
        return [];
      }
      return [{ ...parsed, score: neighbor.score }];
    });
  }
}
