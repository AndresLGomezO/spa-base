import type { ApiEnvelope, ApiErrorBody, ApiErrorCode } from "./errors.js";

export function successEnvelope<T>(data: T): ApiEnvelope<T> {
  return { data, error: null };
}

export function errorEnvelope(error: ApiErrorBody): ApiEnvelope<null> {
  return { data: null, error };
}

export function replyWithError(
  reply: {
    status: (code: number) => { send: (body: ApiEnvelope<null>) => unknown };
  },
  statusCode: number,
  code: ApiErrorCode,
  message: string,
  details?: unknown,
): unknown {
  return reply.status(statusCode).send(
    errorEnvelope({
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    }),
  );
}
