/**
 * Recreates dev Docker Compose services without re-downloading images or
 * clearing the build cache (unless --hard is passed).
 *
 * Usage:
 *   pnpm dev:docker:reset                          # soft reset all services
 *   pnpm dev:docker:reset -- --only api              # reset api only (keeps Firebase data)
 *   pnpm dev:docker:reset -- --only api,web          # reset multiple services
 *   pnpm dev:docker:reset -- --hard                  # full wipe: remove images + build cache
 *   pnpm dev:docker:reset -- --hard --only api       # rebuild api from scratch
 *   pnpm dev:docker:reset -- --only ai --use-real-vertex
 *   pnpm dev:docker:reset -- --only ai --mock-vertex
 *   pnpm dev:docker:reset -- --tunnel              # reset then wire Cloudflare tunnels
 */

import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const COMPOSE_FILE = "docker-compose.dev.yml";
const COMPOSE_AI_REAL_FILE = "docker-compose.dev.ai-real.yml";
const WORKER_ENV_DEV = resolve(repoRoot, "apps/worker-service/.env.dev");
const WORKER_ENV_EXAMPLE = resolve(
  repoRoot,
  "apps/worker-service/.env.dev.example",
);

/** Services started by `dev:docker` (pubsub-init runs once after firebase is healthy). */
const ALL_SERVICES = [
  "firebase-emulator",
  "pubsub-init",
  "api",
  "worker-aggregation",
  "worker-service",
  "web",
] as const;

type ServiceName = (typeof ALL_SERVICES)[number];
type VertexMode = "unchanged" | "mock" | "real";

const SERVICE_ALIASES: Record<string, ServiceName> = {
  firebase: "firebase-emulator",
  "firebase-emulator": "firebase-emulator",
  pubsub: "pubsub-init",
  "pubsub-init": "pubsub-init",
  api: "api",
  worker: "worker-aggregation",
  aggregation: "worker-aggregation",
  "worker-aggregation": "worker-aggregation",
  "worker-service": "worker-service",
  ai: "worker-service",
  web: "web",
};

function printHelp(): void {
  console.log(`
Recreate dev Docker Compose services.

Options:
  --only, --services <names>   Comma-separated services to reset (default: all).
                               Aliases: firebase, pubsub, worker, aggregation, ai
  --hard                       Remove images and build cache before recreate
  --use-real-vertex            Set USE_REAL_VERTEX=true and mount gcloud ADC
  --mock-vertex                Set USE_REAL_VERTEX=false (local Vertex mock)
  --tunnel                     After reset, mint Cloudflare tunnels and wire web/api
  --help, -h                   Show this help

Services: ${ALL_SERVICES.join(", ")}

Examples:
  pnpm dev:docker:reset
  pnpm dev:docker:reset -- --only api
  pnpm dev:docker:reset -- --only ai --use-real-vertex
  pnpm dev:docker:reset -- --only ai --mock-vertex
  pnpm dev:docker:reset -- --hard
  pnpm dev:docker:reset -- --tunnel
`);
}

function ensureWorkerEnvDev(): void {
  if (existsSync(WORKER_ENV_DEV)) {
    return;
  }

  if (existsSync(WORKER_ENV_EXAMPLE)) {
    copyFileSync(WORKER_ENV_EXAMPLE, WORKER_ENV_DEV);
    return;
  }

  writeFileSync(
    WORKER_ENV_DEV,
    [
      "USE_REAL_VERTEX=false",
      "GCP_PROJECT_ID=demo-project-base",
      "GCP_REGION=us-central1",
      "VERTEX_LOCATION=global",
      "VERTEX_MODEL_ID=gemini-3.6-flash",
      "VERTEX_REASONING_MODEL_ID=gemini-3.1-pro-preview",
      "",
    ].join("\n"),
  );
}

function readUseRealVertex(): boolean {
  ensureWorkerEnvDev();
  const match = readFileSync(WORKER_ENV_DEV, "utf8").match(
    /^USE_REAL_VERTEX=(.*)$/m,
  );
  return match?.[1]?.trim() === "true";
}

function setUseRealVertex(value: boolean): void {
  ensureWorkerEnvDev();
  const line = `USE_REAL_VERTEX=${value}`;
  const content = readFileSync(WORKER_ENV_DEV, "utf8");

  if (/^USE_REAL_VERTEX=.*$/m.test(content)) {
    writeFileSync(
      WORKER_ENV_DEV,
      content.replace(/^USE_REAL_VERTEX=.*$/m, line),
    );
    return;
  }

  writeFileSync(WORKER_ENV_DEV, `${content.trimEnd()}\n${line}\n`);
}

function parseVertexMode(argv: string[]): VertexMode {
  const hasReal = argv.includes("--use-real-vertex");
  const hasMock = argv.includes("--mock-vertex");

  if (hasReal && hasMock) {
    console.error("Use only one of --use-real-vertex or --mock-vertex.");
    process.exit(1);
  }

  if (hasReal) return "real";
  if (hasMock) return "mock";
  return "unchanged";
}

function filterResetArgs(argv: string[]): string[] {
  return argv.filter(
    (arg) =>
      arg !== "--use-real-vertex" &&
      arg !== "--mock-vertex" &&
      arg !== "--tunnel",
  );
}

function parseArgs(argv: string[]): { services: ServiceName[]; hard: boolean } {
  if (argv.includes("--help") || argv.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  const hard = argv.includes("--hard");

  const onlyFlag = argv.find((arg) => arg === "--only" || arg === "--services");
  let onlyValue: string | undefined;

  if (onlyFlag) {
    const flagIndex = argv.indexOf(onlyFlag);
    onlyValue = argv[flagIndex + 1];
    if (!onlyValue || onlyValue.startsWith("-")) {
      console.error(`Missing value for ${onlyFlag}`);
      process.exit(1);
    }
  } else {
    onlyValue = argv.find((arg) => !arg.startsWith("-") && arg.includes(","));
    if (!onlyValue) {
      const positional = argv.find((arg) => !arg.startsWith("-"));
      if (positional) onlyValue = positional;
    }
  }

  if (!onlyValue) {
    return { services: [...ALL_SERVICES], hard };
  }

  const requested = onlyValue.split(",").map((s) => s.trim()).filter(Boolean);
  const services: ServiceName[] = [];
  const unknown: string[] = [];

  for (const name of requested) {
    const resolved = SERVICE_ALIASES[name.toLowerCase()];
    if (!resolved) {
      unknown.push(name);
      continue;
    }
    if (!services.includes(resolved)) services.push(resolved);
  }

  if (unknown.length > 0) {
    console.error(`Unknown service(s): ${unknown.join(", ")}`);
    console.error(`Valid: ${ALL_SERVICES.join(", ")}`);
    process.exit(1);
  }

  if (services.includes("firebase-emulator") && !services.includes("pubsub-init")) {
    services.splice(services.indexOf("firebase-emulator") + 1, 0, "pubsub-init");
  }

  return { services, hard };
}

function run(command: string, options?: { allowFailure?: boolean }): boolean {
  console.log(`\n→ ${command}\n`);
  const result = spawnSync(command, {
    cwd: repoRoot,
    env: process.env,
    shell: true,
    stdio: "inherit",
  });

  if (result.status !== 0 && !options?.allowFailure) {
    console.error(`Command failed: ${command}`);
    process.exit(result.status ?? 1);
  }

  return result.status === 0;
}

function composeArgs(services: ServiceName[]): string {
  return services.length > 0 ? services.join(" ") : "";
}

function composeFiles(useRealVertex: boolean): string {
  return useRealVertex
    ? `-f ${COMPOSE_FILE} -f ${COMPOSE_AI_REAL_FILE}`
    : `-f ${COMPOSE_FILE}`;
}

function needsEmulatorsPrepare(services: ServiceName[]): boolean {
  return services.includes("firebase-emulator") || services.includes("web");
}

function resetAll(hard: boolean, useRealVertex: boolean): void {
  const compose = composeFiles(useRealVertex);
  const downFlags = hard
    ? "down -v --rmi all --remove-orphans"
    : "down --remove-orphans";

  run(`docker compose ${compose} ${downFlags}`);

  if (hard) {
    run("docker builder prune -af");
  }

  run("pnpm run emulators:prepare");

  const upServices = composeArgs([...ALL_SERVICES]);
  run(
    `docker compose ${compose} up -d --force-recreate --build ${upServices}`,
  );
}

function resetSelected(
  services: ServiceName[],
  hard: boolean,
  useRealVertex: boolean,
): void {
  const compose = composeFiles(useRealVertex);

  if (needsEmulatorsPrepare(services)) {
    run("pnpm run emulators:prepare");
  }

  const serviceList = composeArgs(services);

  run(`docker compose ${compose} rm -sf ${serviceList}`);

  if (hard) {
    for (const service of services) {
      run(`docker compose ${compose} build --no-cache ${service}`, {
        allowFailure: true,
      });
    }
  }

  run(
    `docker compose ${compose} up -d --force-recreate --build ${serviceList}`,
  );
}

function applyVertexMode(vertexMode: VertexMode): boolean {
  if (vertexMode === "real") {
    setUseRealVertex(true);
    console.log("Vertex mode: real GCP (USE_REAL_VERTEX=true)");
    return true;
  }

  if (vertexMode === "mock") {
    setUseRealVertex(false);
    console.log("Vertex mode: mock (USE_REAL_VERTEX=false)");
    return false;
  }

  const useRealVertex = readUseRealVertex();
  console.log(
    `Vertex mode: ${useRealVertex ? "real GCP" : "mock"} (unchanged)`,
  );
  return useRealVertex;
}

function wireTunnels(): void {
  console.log("\nWiring Cloudflare tunnels after reset…");
  run("pnpm exec tsx scripts/dev-docker-tunnel.ts refresh");
}

function main(): void {
  const rawArgv = process.argv.slice(2);
  const vertexMode = parseVertexMode(rawArgv);
  const useTunnel = rawArgv.includes("--tunnel");
  const { services, hard } = parseArgs(filterResetArgs(rawArgv));
  const useRealVertex = applyVertexMode(vertexMode);
  const isFullReset =
    services.length === ALL_SERVICES.length &&
    ALL_SERVICES.every((service) => services.includes(service));

  console.log(`${hard ? "Hard" : "Soft"} reset: ${services.join(", ")}`);
  if (useTunnel) {
    console.log("Tunnel mode: will re-wire trycloudflare URLs after reset");
  }

  if (isFullReset) {
    resetAll(hard, useRealVertex);
  } else {
    resetSelected(services, hard, useRealVertex);
  }

  if (useTunnel) {
    wireTunnels();
  }

  console.log(
    "\nDone. Follow logs with: docker compose -f docker-compose.dev.yml logs -f",
  );
}

main();
