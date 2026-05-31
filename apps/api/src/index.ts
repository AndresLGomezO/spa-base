import { buildServer } from "./server.js";
import { apiEnv } from "./config/env.js";

function resolveListenPort(): number {
  const platformPort = process.env.PORT;
  if (platformPort != null && platformPort.trim().length > 0) {
    const parsed = Number.parseInt(platformPort, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return apiEnv.API_PORT;
}

async function main() {
  const server = await buildServer();
  await server.listen({
    host: apiEnv.API_HOST,
    port: resolveListenPort(),
  });
}

void main();
