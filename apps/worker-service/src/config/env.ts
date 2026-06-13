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
  GCP_STORAGE_BUCKET: z.string().trim().optional(),
  FIRESTORE_EMULATOR_HOST: z.string().trim().optional(),
  FIREBASE_AUTH_EMULATOR_HOST: z.string().trim().optional(),
  FIREBASE_STORAGE_EMULATOR_HOST: z.string().trim().optional(),
  FIREBASE_STORAGE_EMULATOR_PUBLIC_HOST: z.string().trim().optional(),
  VERTEX_MODEL_ID: z.string().trim().min(1).default("gemini-2.5-flash"),
  USE_REAL_VERTEX: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  TASKS_SA_EMAIL: z.string().trim().optional(),
  WORKER_AUTH_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
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
  region: workerEnv.GCP_REGION,
  modelId: workerEnv.VERTEX_MODEL_ID,
  mockEnabled: workerEnv.IS_LOCAL && !workerEnv.USE_REAL_VERTEX,
};

export const authConfig = {
  authEnabled:
    !workerEnv.IS_LOCAL ||
    workerEnv.WORKER_AUTH_ENABLED ||
    process.env.NODE_ENV === "production",
  allowLocalTaskBypass: workerEnv.IS_LOCAL,
  serviceAccountEmail: workerEnv.TASKS_SA_EMAIL ?? "",
};
