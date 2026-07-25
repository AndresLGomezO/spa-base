export interface VectorDatapoint {
  readonly id: string;
  readonly embedding: readonly number[];
  readonly restricts: {
    readonly tenantId: string;
    readonly entityName: string;
    readonly accessUserIds: readonly string[];
    readonly tenantWideRead: boolean;
  };
}

export interface VectorNeighbor {
  readonly id: string;
  readonly distance: number;
  readonly score: number;
}

export interface VectorIndexClient {
  upsert(datapoints: readonly VectorDatapoint[]): Promise<void>;
  remove(ids: readonly string[]): Promise<void>;
  findNeighbors(input: {
    readonly embedding: readonly number[];
    readonly topK: number;
    readonly restricts: {
      readonly tenantId: string;
      readonly entityName?: string;
      readonly userId: string;
    };
  }): Promise<readonly VectorNeighbor[]>;
}
