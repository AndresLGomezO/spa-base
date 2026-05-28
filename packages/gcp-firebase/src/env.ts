import { z } from "zod";

export const FirebaseRuntimeEnvSchema = z.object({
  GCP_PROJECT_ID: z.string().trim().min(1),
  FIREBASE_AUTH_EMULATOR_HOST: z.string().trim().optional(),
});

export type FirebaseRuntimeEnv = z.infer<typeof FirebaseRuntimeEnvSchema>;
