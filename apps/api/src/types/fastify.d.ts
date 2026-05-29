import type { AppRole } from "@repo/rbac-app";

declare module "fastify" {
  interface FastifyRequest {
    user?: {
      readonly uid: string;
      readonly email: string | null;
      readonly role: AppRole;
    };
  }
}

export {};
