import { cosineSimilarity } from "./cosine.js";
import type {
  VectorDatapoint,
  VectorIndexClient,
  VectorNeighbor,
} from "./types.js";

function assertDimensions(
  embedding: readonly number[],
  dimensions: number | undefined,
): void {
  if (embedding.length === 0) {
    throw new Error("Vector embeddings must not be empty.");
  }
  if (dimensions !== undefined && embedding.length !== dimensions) {
    throw new Error(
      `Expected embedding dimension ${dimensions}, received ${embedding.length}.`,
    );
  }
}

export function createInMemoryVectorIndexClient(options?: {
  readonly dimensions?: number;
}): VectorIndexClient {
  const datapoints = new Map<string, VectorDatapoint>();
  const dimensions = options?.dimensions;

  return {
    async upsert(input) {
      for (const datapoint of input) {
        assertDimensions(datapoint.embedding, dimensions);
        datapoints.set(datapoint.id, {
          ...datapoint,
          embedding: [...datapoint.embedding],
          restricts: {
            ...datapoint.restricts,
            accessUserIds: [...datapoint.restricts.accessUserIds],
          },
        });
      }
    },

    async remove(ids) {
      for (const id of ids) {
        datapoints.delete(id);
      }
    },

    async findNeighbors(input) {
      assertDimensions(input.embedding, dimensions);
      const neighbors: VectorNeighbor[] = [];

      for (const datapoint of datapoints.values()) {
        const restricts = datapoint.restricts;
        if (
          restricts.tenantId !== input.restricts.tenantId ||
          (input.restricts.entityName !== undefined &&
            restricts.entityName !== input.restricts.entityName) ||
          (!restricts.tenantWideRead &&
            !restricts.accessUserIds.includes(input.restricts.userId))
        ) {
          continue;
        }

        const score = cosineSimilarity(input.embedding, datapoint.embedding);
        neighbors.push({
          id: datapoint.id,
          distance: 1 - score,
          score,
        });
      }

      return neighbors
        .sort((left, right) => right.score - left.score)
        .slice(0, input.topK);
    },
  };
}
