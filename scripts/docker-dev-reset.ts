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
 */

import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const COMPOSE_FILE = "docker-compose.dev.yml";

/** Services started by `dev:docker` (pubsub-init runs once after firebase is healthy). */
const ALL_SERVICES = [
  "firebase-emulator",
  "pubsub-init",
  "api",
  "worker-aggregation",
  "web",
] as const;

type ServiceName = (typeof ALL_SERVICES)[number];

const SERVICE_ALIASES: Record<string, ServiceName> = {
  firebase: "firebase-emulator",
  "firebase-emulator": "firebase-emulator",
  pubsub: "pubsub-init",
  "pubsub-init": "pubsub-init",
  api: "api",
  worker: "worker-aggregation",
  aggregation: "worker-aggregation",
  "worker-aggregation": "worker-aggregation",
  web: "web",
};

function printHelp(): void {
  console.log(`
Recreate dev Docker Compose services.

Options:
  --only, --services <names>   Comma-separated services to reset (default: all).
                               Aliases: firebase, pubsub, worker, aggregation
  --hard                       Remove images and build cache before recreate
  --help, -h                   Show this help

Services: ${ALL_SERVICES.join(", ")}

Examples:
  pnpm dev:docker:reset
  pnpm dev:docker:reset -- --only api
  pnpm dev:docker:reset -- --only api,web
  pnpm dev:docker:reset -- --hard
`);
}

function parseArgs(): { services: ServiceName[]; hard: boolean } {
  const argv = process.argv.slice(2);

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

function needsEmulatorsPrepare(services: ServiceName[]): boolean {
  return services.includes("firebase-emulator") || services.includes("web");
}

function resetAll(hard: boolean): void {
  const downFlags = hard
    ? "down -v --rmi all --remove-orphans"
    : "down --remove-orphans";

  run(`docker compose -f ${COMPOSE_FILE} ${downFlags}`);

  if (hard) {
    run("docker builder prune -af");
  }

  run("pnpm run emulators:prepare");

  const upServices = composeArgs([...ALL_SERVICES]);
  run(
    `docker compose -f ${COMPOSE_FILE} up -d --force-recreate --build ${upServices}`,
  );
}

function resetSelected(services: ServiceName[], hard: boolean): void {
  if (needsEmulatorsPrepare(services)) {
    run("pnpm run emulators:prepare");
  }

  const serviceList = composeArgs(services);

  run(`docker compose -f ${COMPOSE_FILE} rm -sf ${serviceList}`);

  if (hard) {
    for (const service of services) {
      run(`docker compose -f ${COMPOSE_FILE} build --no-cache ${service}`, {
        allowFailure: true,
      });
    }
  }

  run(
    `docker compose -f ${COMPOSE_FILE} up -d --force-recreate --build ${serviceList}`,
  );
}

function main(): void {
  const { services, hard } = parseArgs();
  const isFullReset = services.length === ALL_SERVICES.length &&
    ALL_SERVICES.every((s) => services.includes(s));

  console.log(
    `${hard ? "Hard" : "Soft"} reset: ${services.join(", ")}`,
  );

  if (isFullReset) {
    resetAll(hard);
  } else {
    resetSelected(services, hard);
  }

  console.log("\nDone. Follow logs with: docker compose -f docker-compose.dev.yml logs -f");
}

main();
