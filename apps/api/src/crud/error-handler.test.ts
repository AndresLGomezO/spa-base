import Fastify from "fastify";
import { describe, expect, it } from "vitest";

import { registerCrudErrorHandler } from "./error-handler.js";

describe("registerCrudErrorHandler", () => {
  it("returns 413 when the request body exceeds the route limit", async () => {
    const app = Fastify({ logger: false, bodyLimit: 16 });
    registerCrudErrorHandler(app);

    app.post("/upload", async () => ({ ok: true }));
    await app.ready();

    const response = await app.inject({
      method: "POST",
      url: "/upload",
      payload: { data: "x".repeat(32) },
    });

    expect(response.statusCode).toBe(413);
    expect(response.json()).toEqual({
      data: null,
      error: {
        code: "VALIDATION_ERROR",
        message: "Request body is too large.",
      },
    });

    await app.close();
  });
});
