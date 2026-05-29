import type { FastifyReply, FastifyRequest } from "fastify";

/** WS4 extension point — no-op until RBAC workstream. */
export async function noopPreHandler(
  _request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  void _request;
  void _reply;
}
