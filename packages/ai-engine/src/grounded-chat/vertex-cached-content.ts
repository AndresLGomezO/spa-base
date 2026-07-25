import type { VertexAiConfig } from "../vertex-ai.client.js";
import {
  resolveGeminiLocation,
  resolveVertexApiEndpoint,
} from "../vertex-ai.client.js";
import { VERTEX_CACHE_TTL_SECONDS } from "./constants.js";

export interface VertexCachedContentHandle {
  readonly name: string;
  readonly expireTime: string;
}

export interface VertexCachedContentClient {
  create(input: {
    readonly config: VertexAiConfig;
    readonly modelId: string;
    readonly systemInstruction: string;
    readonly prefixText: string;
    readonly ttlSeconds?: number;
    readonly displayName?: string;
  }): Promise<VertexCachedContentHandle>;
  delete(input: {
    readonly config: VertexAiConfig;
    readonly name: string;
  }): Promise<void>;
}

async function getAccessToken(): Promise<string> {
  // google-auth-library is a transitive dependency of @google-cloud/vertexai.
  const { GoogleAuth } = await import("google-auth-library");
  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  if (!token.token) {
    throw new Error("Failed to obtain Google access token for Vertex cache.");
  }
  return token.token;
}

function cachedContentsUrl(config: VertexAiConfig): string {
  const location = resolveGeminiLocation(config);
  const host =
    resolveVertexApiEndpoint(location) ??
    `${location}-aiplatform.googleapis.com`;
  return `https://${host}/v1/projects/${config.projectId}/locations/${location}/cachedContents`;
}

function modelResourceName(config: VertexAiConfig, modelId: string): string {
  const location = resolveGeminiLocation(config);
  return `projects/${config.projectId}/locations/${location}/publishers/google/models/${modelId}`;
}

export function createRestVertexCachedContentClient(): VertexCachedContentClient {
  return {
    async create(input) {
      const token = await getAccessToken();
      const ttlSeconds = input.ttlSeconds ?? VERTEX_CACHE_TTL_SECONDS;
      const body = {
        model: modelResourceName(input.config, input.modelId),
        systemInstruction: {
          role: "system",
          parts: [{ text: input.systemInstruction }],
        },
        contents: [
          {
            role: "user",
            parts: [
              { text: input.prefixText || "(empty tenant/user context)" },
            ],
          },
        ],
        ttl: `${ttlSeconds}s`,
        ...(input.displayName ? { displayName: input.displayName } : {}),
      };

      const response = await fetch(cachedContentsUrl(input.config), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(
          `Vertex CachedContent create failed (${response.status}): ${text}`,
        );
      }

      const json = (await response.json()) as {
        name?: string;
        expireTime?: string;
      };
      if (!json.name) {
        throw new Error("Vertex CachedContent create returned no name.");
      }
      const expireTime =
        json.expireTime ??
        new Date(Date.now() + ttlSeconds * 1000).toISOString();
      return { name: json.name, expireTime };
    },

    async delete(input) {
      const token = await getAccessToken();
      const location = resolveGeminiLocation(input.config);
      const host =
        resolveVertexApiEndpoint(location) ??
        `${location}-aiplatform.googleapis.com`;
      const url = `https://${host}/v1/${input.name}`;
      const response = await fetch(url, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok && response.status !== 404) {
        const text = await response.text();
        throw new Error(
          `Vertex CachedContent delete failed (${response.status}): ${text}`,
        );
      }
    },
  };
}

export function createMockVertexCachedContentClient(): VertexCachedContentClient {
  let seq = 0;
  return {
    async create(input) {
      seq += 1;
      const ttlSeconds = input.ttlSeconds ?? VERTEX_CACHE_TTL_SECONDS;
      return {
        name: `projects/${input.config.projectId}/locations/global/cachedContents/mock-${seq}`,
        expireTime: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
      };
    },
    async delete() {
      // no-op
    },
  };
}
