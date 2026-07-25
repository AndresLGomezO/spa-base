import { GoogleAuth } from "google-auth-library";

import type {
  VectorDatapoint,
  VectorIndexClient,
  VectorNeighbor,
} from "./types.js";

const TENANT_NAMESPACE = "tenantId";
const ENTITY_NAMESPACE = "entityName";
const ACCESS_NAMESPACE = "access";
const TENANT_WIDE_VALUE = "__tenant_wide__";
const NO_ACCESS_VALUE = "__no_access__";
const AIPLATFORM_SCOPE = "https://www.googleapis.com/auth/cloud-platform";

interface VertexNeighborResponse {
  readonly nearestNeighbors?: readonly {
    readonly neighbors?: readonly {
      readonly datapoint?: { readonly datapointId?: string };
      readonly distance?: number;
    }[];
  }[];
}

function required(value: string, name: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`Vertex Vector Search config is missing ${name}.`);
  }
  return normalized;
}

function resourceName(
  projectId: string,
  region: string,
  kind: "indexes" | "indexEndpoints",
  id: string,
): string {
  return id.startsWith("projects/")
    ? id
    : `projects/${projectId}/locations/${region}/${kind}/${id}`;
}

function endpointOrigin(config: {
  readonly region: string;
  readonly publicEndpointDomain?: string;
}): string {
  if (config.publicEndpointDomain?.trim()) {
    const domain = config.publicEndpointDomain
      .trim()
      .replace(/^https?:\/\//u, "")
      .replace(/\/+$/u, "");
    return `https://${domain}`;
  }
  return `https://${config.region}-aiplatform.googleapis.com`;
}

function toVertexDatapoint(datapoint: VectorDatapoint): object {
  const allowedAccessValues = datapoint.restricts.tenantWideRead
    ? [TENANT_WIDE_VALUE, ...datapoint.restricts.accessUserIds]
    : [...datapoint.restricts.accessUserIds];
  const accessValues =
    allowedAccessValues.length > 0 ? allowedAccessValues : [NO_ACCESS_VALUE];

  return {
    datapointId: datapoint.id,
    featureVector: datapoint.embedding,
    restricts: [
      {
        namespace: TENANT_NAMESPACE,
        allowList: [datapoint.restricts.tenantId],
      },
      {
        namespace: ENTITY_NAMESPACE,
        allowList: [datapoint.restricts.entityName],
      },
      { namespace: ACCESS_NAMESPACE, allowList: accessValues },
    ],
  };
}

/**
 * Vertex Vector Search REST client.
 *
 * Expected worker env vars:
 * VERTEX_VECTOR_INDEX_ID, VERTEX_VECTOR_INDEX_ENDPOINT_ID,
 * VERTEX_VECTOR_REGION, VERTEX_VECTOR_DEPLOYED_INDEX_ID, and optionally the
 * public endpoint domain. Application Default Credentials provide OAuth.
 */
export function createRestVertexVectorIndexClient(config: {
  readonly projectId: string;
  readonly region: string;
  readonly indexId: string;
  readonly indexEndpointId: string;
  readonly publicEndpointDomain?: string;
  readonly deployedIndexId?: string;
}): VectorIndexClient {
  const projectId = required(config.projectId, "projectId");
  const region = required(config.region, "region");
  const indexId = required(config.indexId, "indexId");
  const indexEndpointId = required(config.indexEndpointId, "indexEndpointId");
  const indexName = resourceName(projectId, region, "indexes", indexId);
  const endpointName = resourceName(
    projectId,
    region,
    "indexEndpoints",
    indexEndpointId,
  );
  const controlOrigin = `https://${region}-aiplatform.googleapis.com`;
  const queryOrigin = endpointOrigin({
    region,
    ...(config.publicEndpointDomain
      ? { publicEndpointDomain: config.publicEndpointDomain }
      : {}),
  });
  const auth = new GoogleAuth({ scopes: [AIPLATFORM_SCOPE] });

  async function post<T>(url: string, data: object): Promise<T> {
    try {
      const client = await auth.getClient();
      const response = await client.request<T>({ url, method: "POST", data });
      return response.data;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown Vertex REST error";
      throw new Error(`Vertex Vector Search request failed: ${message}`, {
        cause: error,
      });
    }
  }

  return {
    async upsert(datapoints) {
      if (datapoints.length === 0) {
        return;
      }
      await post(`${controlOrigin}/v1/${indexName}:upsertDatapoints`, {
        datapoints: datapoints.map(toVertexDatapoint),
      });
    },

    async remove(ids) {
      if (ids.length === 0) {
        return;
      }
      await post(`${controlOrigin}/v1/${indexName}:removeDatapoints`, {
        datapointIds: ids,
      });
    },

    async findNeighbors(input) {
      const restricts = [
        {
          namespace: TENANT_NAMESPACE,
          allowList: [input.restricts.tenantId],
        },
        ...(input.restricts.entityName
          ? [
              {
                namespace: ENTITY_NAMESPACE,
                allowList: [input.restricts.entityName],
              },
            ]
          : []),
        {
          namespace: ACCESS_NAMESPACE,
          allowList: [input.restricts.userId, TENANT_WIDE_VALUE],
        },
      ];
      const response = await post<VertexNeighborResponse>(
        `${queryOrigin}/v1/${endpointName}:findNeighbors`,
        {
          ...(config.deployedIndexId
            ? { deployedIndexId: config.deployedIndexId }
            : {}),
          queries: [
            {
              datapoint: {
                featureVector: input.embedding,
                restricts,
              },
              neighborCount: input.topK,
            },
          ],
          returnFullDatapoint: false,
        },
      );

      return (response.nearestNeighbors?.[0]?.neighbors ?? []).flatMap(
        (neighbor): VectorNeighbor[] => {
          const id = neighbor.datapoint?.datapointId;
          if (!id) {
            return [];
          }
          const distance = neighbor.distance ?? 0;
          return [{ id, distance, score: 1 - distance }];
        },
      );
    },
  };
}
