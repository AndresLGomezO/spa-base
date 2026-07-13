/**
 * Temporary Cloudflare quick-tunnel mode for Docker Compose demos.
 *
 * Usage:
 *   pnpm dev:docker:tunnel            # ensure stack up, mint tunnels, wire web/api
 *   pnpm dev:docker:tunnel:refresh    # rotate tunnel URLs and recreate web/api
 *   pnpm dev:docker:tunnel:stop       # kill tunnels and restore localhost compose env
 */

import {
  spawn,
  spawnSync,
  type ChildProcessWithoutNullStreams,
} from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const COMPOSE_FILE = "docker-compose.dev.yml";
const COMPOSE_TUNNEL_FILE = "docker-compose.dev.tunnel.yml";
const TUNNEL_DIR = resolve(repoRoot, ".local/tunnel");
const URLS_ENV = resolve(TUNNEL_DIR, "urls.env");
const PIDS_FILE = resolve(TUNNEL_DIR, "pids.json");

const QUICK_TUNNEL_URL_REGEX = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/;
const TUNNEL_READY_TIMEOUT_MS = 60_000;

const ALL_STACK_SERVICES = [
  "firebase-emulator",
  "pubsub-init",
  "api",
  "worker-aggregation",
  "worker-service",
  "web",
] as const;

const TUNNEL_TARGETS = [
  { name: "web", port: 5173 },
  { name: "api", port: 3000 },
  { name: "auth", port: 9099 },
  { name: "storage", port: 9199 },
] as const;

type TunnelName = (typeof TUNNEL_TARGETS)[number]["name"];

type TunnelMeta = {
  name: TunnelName;
  port: number;
  pid: number;
  url: string;
};

type Command = "start" | "stop" | "refresh";

function printHelp(): void {
  console.log(`
Temporary Cloudflare quick-tunnel mode for Docker Compose.

Commands:
  start (default)   Ensure stack is up, start tunnels, recreate web/api/worker-service
  refresh           Kill existing tunnels, mint new URLs, recreate browser-facing services
  stop              Kill tunnels and restore localhost compose env
  --help, -h        Show this help

Requires cloudflared on PATH. Generated state lives in .local/tunnel/ (gitignored).
`);
}

function parseCommand(argv: string[]): Command {
  if (argv.includes("--help") || argv.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  const positional = argv.find((arg) => !arg.startsWith("-")) ?? "start";
  if (positional === "start" || positional === "stop" || positional === "refresh") {
    return positional;
  }

  console.error(`Unknown command: ${positional}`);
  printHelp();
  process.exit(1);
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

function ensureCloudflared(): void {
  const result = spawnSync("cloudflared", ["--version"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    console.error(
      "cloudflared is required on PATH. Install: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/",
    );
    process.exit(1);
  }
  console.log(`cloudflared: ${(result.stdout || result.stderr || "").trim()}`);
}

function ensureTunnelDir(): void {
  mkdirSync(TUNNEL_DIR, { recursive: true });
}

function readPids(): TunnelMeta[] {
  if (!existsSync(PIDS_FILE)) {
    return [];
  }
  try {
    const parsed = JSON.parse(readFileSync(PIDS_FILE, "utf8")) as {
      tunnels?: TunnelMeta[];
    };
    return Array.isArray(parsed.tunnels) ? parsed.tunnels : [];
  } catch {
    return [];
  }
}

function killPid(pid: number): void {
  try {
    process.kill(pid, 0);
  } catch {
    return;
  }

  try {
    process.kill(pid, "SIGTERM");
  } catch {
    return;
  }

  const deadline = Date.now() + 3_000;
  while (Date.now() < deadline) {
    try {
      process.kill(pid, 0);
      spawnSync("sleep", ["0.1"]);
    } catch {
      return;
    }
  }

  try {
    process.kill(pid, "SIGKILL");
  } catch {
    // already gone
  }
}

function stopExistingTunnels(): void {
  const existing = readPids();
  for (const tunnel of existing) {
    console.log(`Stopping ${tunnel.name} tunnel (pid ${tunnel.pid})…`);
    killPid(tunnel.pid);
  }

  if (existsSync(PIDS_FILE)) {
    rmSync(PIDS_FILE, { force: true });
  }
  if (existsSync(URLS_ENV)) {
    rmSync(URLS_ENV, { force: true });
  }
}

function startQuickTunnel(
  name: TunnelName,
  port: number,
): Promise<TunnelMeta> {
  return new Promise((resolvePromise, reject) => {
    const child: ChildProcessWithoutNullStreams = spawn(
      "cloudflared",
      ["tunnel", "--url", `http://127.0.0.1:${port}`],
      {
        cwd: repoRoot,
        env: process.env,
        stdio: ["ignore", "pipe", "pipe"],
        detached: true,
      },
    );

    let stderr = "";
    let settled = false;

    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      try {
        if (child.pid) process.kill(-child.pid, "SIGTERM");
      } catch {
        child.kill("SIGTERM");
      }
      reject(
        new Error(
          `Timed out waiting for ${name} tunnel on :${port} (${TUNNEL_READY_TIMEOUT_MS / 1000}s).\n${stderr}`,
        ),
      );
    }, TUNNEL_READY_TIMEOUT_MS);

    const onChunk = (chunk: Buffer): void => {
      const text = chunk.toString();
      stderr += text;
      const match = QUICK_TUNNEL_URL_REGEX.exec(stderr);
      if (!match || settled) return;

      settled = true;
      clearTimeout(timeout);
      if (!child.pid) {
        reject(new Error(`cloudflared for ${name} started without a pid`));
        return;
      }

      child.unref();
      resolvePromise({
        name,
        port,
        pid: child.pid,
        url: match[0],
      });
    };

    child.stderr.on("data", onChunk);
    child.stdout.on("data", onChunk);

    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(error);
    });

    child.on("exit", (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      const reason = signal
        ? `terminated by signal ${signal}`
        : `exited with code ${code}`;
      reject(
        new Error(
          `cloudflared for ${name} ${reason} before the tunnel was ready.\n${stderr}`,
        ),
      );
    });
  });
}

function writeTunnelState(tunnels: TunnelMeta[]): void {
  ensureTunnelDir();

  const byName = Object.fromEntries(
    tunnels.map((tunnel) => [tunnel.name, tunnel]),
  ) as Record<TunnelName, TunnelMeta>;

  const webUrl = byName.web.url;
  const apiUrl = byName.api.url;
  const authUrl = byName.auth.url;
  const storageHost = new URL(byName.storage.url).host;

  const envLines = [
    `# Generated by scripts/dev-docker-tunnel.ts — do not commit`,
    `WEB_TUNNEL_URL=${webUrl}`,
    `VITE_API_URL=${apiUrl}`,
    `VITE_FIREBASE_AUTH_EMULATOR_HOST=${authUrl}`,
    `VITE_FIREBASE_STORAGE_EMULATOR_PUBLIC_HOST=${storageHost}`,
    `API_CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,${webUrl}`,
    `WEB_APP_ORIGIN=${webUrl}`,
    `FIREBASE_STORAGE_EMULATOR_PUBLIC_HOST=${storageHost}`,
    "",
  ];

  writeFileSync(URLS_ENV, envLines.join("\n"));
  writeFileSync(
    PIDS_FILE,
    `${JSON.stringify({ createdAt: new Date().toISOString(), tunnels }, null, 2)}\n`,
  );
}

function composeBaseArgs(): string {
  return `-f ${COMPOSE_FILE}`;
}

function composeTunnelArgs(): string {
  return `-f ${COMPOSE_FILE} -f ${COMPOSE_TUNNEL_FILE} --env-file ${URLS_ENV}`;
}

function ensureStackUp(): void {
  const services = ALL_STACK_SERVICES.join(" ");
  run(
    `docker compose ${composeBaseArgs()} up -d --build ${services}`,
  );
}

function recreateTunnelServices(): void {
  run(
    `docker compose ${composeTunnelArgs()} up -d --force-recreate web api worker-service`,
  );
}

function restoreLocalhostServices(): void {
  run(
    `docker compose ${composeBaseArgs()} up -d --force-recreate web api worker-service`,
  );
}

async function startTunnelsAndWire(): Promise<void> {
  ensureCloudflared();
  ensureTunnelDir();
  stopExistingTunnels();
  ensureStackUp();

  console.log("\nStarting Cloudflare quick tunnels…");
  const tunnels: TunnelMeta[] = [];
  for (const target of TUNNEL_TARGETS) {
    console.log(`  ${target.name} → http://127.0.0.1:${target.port}`);
    const meta = await startQuickTunnel(target.name, target.port);
    console.log(`  ${target.name} public: ${meta.url}`);
    tunnels.push(meta);
  }

  writeTunnelState(tunnels);
  recreateTunnelServices();

  const webUrl = tunnels.find((tunnel) => tunnel.name === "web")?.url;
  console.log("\nTunnel mode ready.");
  console.log(`Open: ${webUrl}`);
  console.log(`State: ${TUNNEL_DIR}`);
  console.log("Stop with: pnpm dev:docker:tunnel:stop");
}

async function refreshTunnels(): Promise<void> {
  ensureCloudflared();
  ensureTunnelDir();
  stopExistingTunnels();

  console.log("\nMinting new Cloudflare quick tunnels…");
  const tunnels: TunnelMeta[] = [];
  for (const target of TUNNEL_TARGETS) {
    console.log(`  ${target.name} → http://127.0.0.1:${target.port}`);
    const meta = await startQuickTunnel(target.name, target.port);
    console.log(`  ${target.name} public: ${meta.url}`);
    tunnels.push(meta);
  }

  writeTunnelState(tunnels);
  recreateTunnelServices();

  const webUrl = tunnels.find((tunnel) => tunnel.name === "web")?.url;
  console.log("\nTunnels refreshed.");
  console.log(`Open: ${webUrl}`);
}

function stopTunnelMode(): void {
  stopExistingTunnels();
  restoreLocalhostServices();
  console.log("\nTunnel mode stopped. Web/API restored to localhost compose env.");
}

async function main(): Promise<void> {
  const command = parseCommand(process.argv.slice(2));

  if (command === "stop") {
    stopTunnelMode();
    return;
  }

  if (command === "refresh") {
    await refreshTunnels();
    return;
  }

  await startTunnelsAndWire();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
