import { buildServer } from "./server.js";
import { apiEnv } from "./config/env.js";
async function main() {
    const server = await buildServer();
    await server.listen({
        host: apiEnv.API_HOST,
        port: apiEnv.API_PORT,
    });
}
void main();
