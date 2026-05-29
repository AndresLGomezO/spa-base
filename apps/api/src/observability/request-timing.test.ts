import Fastify from "fastify";
import { describe, expect, it } from "vitest";

import { registerRequestTiming } from "./request-timing.js";

describe("registerRequestTiming", () => {
  it("attaches timing state to requests", async () => {
    const app = Fastify({ logger: false });
    registerRequestTiming(app, { enabled: false });

    app.get("/health", async (request) => {
      expect(request.perfTiming?.startedAt).toBeTypeOf("number");
      return { ok: true };
    });

    await app.ready();
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    await app.close();
  });
});
