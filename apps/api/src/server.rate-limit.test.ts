import compress from "@fastify/compress";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import { describe, expect, it } from "vitest";

describe("rate limit plugin", () => {
  it("returns 429 when the request budget is exceeded", async () => {
    const app = Fastify({ logger: false });
    await app.register(compress);
    await app.register(rateLimit, {
      max: 2,
      timeWindow: 60_000,
    });

    app.get("/limited", async () => ({ ok: true }));
    await app.ready();

    const first = await app.inject({ method: "GET", url: "/limited" });
    const second = await app.inject({ method: "GET", url: "/limited" });
    const third = await app.inject({ method: "GET", url: "/limited" });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(third.statusCode).toBe(429);

    await app.close();
  });
});
