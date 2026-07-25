import { z } from "zod";

const workerEnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  HOST: z.string().trim().min(1).default("0.0.0.0"),
  NODE_ENV: z.string().trim().default("development"),
  IS_LOCAL: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  GCP_PROJECT_ID: z.string().trim().min(1),
  VERTEX_GCP_PROJECT_ID: z.string().trim().optional(),
  GCP_REGION: z.string().trim().min(1).default("us-central1"),
  VERTEX_VECTOR_INDEX_ID: z.string().trim().optional(),
  VERTEX_VECTOR_INDEX_ENDPOINT_ID: z.string().trim().optional(),
  VERTEX_VECTOR_DIM: z.coerce.number().int().positive().default(768),
  VERTEX_VECTOR_REGION: z.string().trim().optional(),
  VERTEX_VECTOR_DEPLOYED_INDEX_ID: z.string().trim().optional(),
  VERTEX_VECTOR_PUBLIC_ENDPOINT_DOMAIN: z.string().trim().optional(),
  /**
   * Vertex location for Gemini generateContent.
   * Gemini 3.x preview models (incl. gemini-3.1-pro-preview) are global-only.
   */
  VERTEX_LOCATION: z.string().trim().min(1).default("global"),
  GCP_STORAGE_BUCKET: z.string().trim().optional(),
  FIRESTORE_EMULATOR_HOST: z.string().trim().optional(),
  FIREBASE_AUTH_EMULATOR_HOST: z.string().trim().optional(),
  FIREBASE_STORAGE_EMULATOR_HOST: z.string().trim().optional(),
  FIREBASE_STORAGE_EMULATOR_PUBLIC_HOST: z.string().trim().optional(),
  /** Default Gemini for classify, chat, UI builder, Gmail extract. */
  VERTEX_MODEL_ID: z.string().trim().min(1).default("gemini-3.6-flash"),
  /** Gemini for demanding narrative / contract JSON summaries (callAi without includeEntities). */
  VERTEX_REASONING_MODEL_ID: z
    .string()
    .trim()
    .min(1)
    .default("gemini-3.1-pro-preview"),
  VERTEX_IMAGEN_MODEL_ID: z
    .string()
    .trim()
    .min(1)
    .default("imagen-3.0-generate-002"),
  USE_REAL_VERTEX: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  TASKS_SA_EMAIL: z.string().trim().optional(),
  WORKER_AUTH_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  SCHEDULED_HOOK_USER_UID: z.string().trim().optional(),
  TENANT_ENCRYPTION_MASTER_KEY: z.string().trim().optional(),
  GMAIL_OAUTH_CLIENT_ID: z.string().trim().optional(),
  GMAIL_OAUTH_CLIENT_SECRET: z.string().trim().optional(),
  GMAIL_PUBSUB_TOPIC: z.string().trim().optional(),
  /** poll = Cloud Scheduler history sync; push = Gmail Pub/Sub watch. Mutually exclusive. */
  GMAIL_INGEST_DELIVERY_MODE: z.enum(["poll", "push"]).default("poll"),
  WORKER_SERVICE_URL: z.string().trim().default("http://127.0.0.1:3001"),
  GMAIL_TASKS_QUEUE_NAME: z.string().trim().default("gmail-jobs"),
  AI_EMBED_TASKS_QUEUE_NAME: z.string().trim().default("ai-embed"),
  GMAIL_TASKS_LOCAL_DISPATCH: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  AGGREGATION_EVENTS_PUBSUB: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  AGGREGATION_EVENTS_TOPIC: z
    .string()
    .trim()
    .min(1)
    .default("aggregation-events"),
});

const parsed = workerEnvSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(
    `Invalid worker-service environment: ${JSON.stringify(parsed.error.format())}`,
  );
}

export const workerEnv = parsed.data;

export const vertexAiConfig = {
  projectId: workerEnv.VERTEX_GCP_PROJECT_ID ?? workerEnv.GCP_PROJECT_ID,
  /** Regional endpoint for embeddings / Imagen. */
  region: workerEnv.GCP_REGION,
  /** Global (default) for Gemini 3.x generateContent. */
  geminiLocation: workerEnv.VERTEX_LOCATION,
  modelId: workerEnv.VERTEX_MODEL_ID,
  reasoningModelId: workerEnv.VERTEX_REASONING_MODEL_ID,
  imagenModelId: workerEnv.VERTEX_IMAGEN_MODEL_ID,
  mockEnabled: workerEnv.IS_LOCAL && !workerEnv.USE_REAL_VERTEX,
};

export const vertexVectorConfig = {
  projectId: workerEnv.VERTEX_GCP_PROJECT_ID ?? workerEnv.GCP_PROJECT_ID,
  region: workerEnv.VERTEX_VECTOR_REGION ?? workerEnv.GCP_REGION,
  dimensions: workerEnv.VERTEX_VECTOR_DIM,
  indexId: workerEnv.VERTEX_VECTOR_INDEX_ID,
  indexEndpointId: workerEnv.VERTEX_VECTOR_INDEX_ENDPOINT_ID,
  deployedIndexId: workerEnv.VERTEX_VECTOR_DEPLOYED_INDEX_ID,
  publicEndpointDomain: workerEnv.VERTEX_VECTOR_PUBLIC_ENDPOINT_DOMAIN,
  useInMemory:
    (workerEnv.IS_LOCAL && !workerEnv.USE_REAL_VERTEX) ||
    !workerEnv.VERTEX_VECTOR_INDEX_ID ||
    !workerEnv.VERTEX_VECTOR_INDEX_ENDPOINT_ID,
};

export const authConfig = {
  authEnabled:
    !workerEnv.IS_LOCAL ||
    workerEnv.WORKER_AUTH_ENABLED ||
    process.env.NODE_ENV === "production",
  allowLocalTaskBypass: workerEnv.IS_LOCAL,
  serviceAccountEmail: workerEnv.TASKS_SA_EMAIL ?? "",
};

export const scheduleTickConfig = {
  scheduledHookUserUid: workerEnv.SCHEDULED_HOOK_USER_UID ?? "",
};
