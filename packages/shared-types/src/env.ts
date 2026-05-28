import { z } from "zod";

export const AppEnvSchema = z.enum(["dev", "pr", "prod"]);

export type AppEnv = z.infer<typeof AppEnvSchema>;
