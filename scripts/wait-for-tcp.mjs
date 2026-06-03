#!/usr/bin/env node
/**
 * Wait until TCP ports accept connections (used by Docker dev entrypoints).
 *
 * Usage:
 *   node scripts/wait-for-tcp.mjs host:9099 host:8080
 */

import net from "node:net";

const TIMEOUT_MS = 120_000;
const INTERVAL_MS = 1_000;

function parseTarget(raw) {
  const [host, portText] = raw.split(":");
  const port = Number.parseInt(portText ?? "", 10);
  if (!host || !Number.isFinite(port) || port <= 0) {
    throw new Error(`Invalid target "${raw}". Expected host:port.`);
  }
  return { host, port, label: raw };
}

function canConnect(host, port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port }, () => {
      socket.end();
      resolve(true);
    });
    socket.setTimeout(2_000, () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("error", () => resolve(false));
  });
}

const targets = process.argv.slice(2).map(parseTarget);
if (targets.length === 0) {
  console.error("Usage: node scripts/wait-for-tcp.mjs host:port [host:port ...]");
  process.exit(1);
}

const deadline = Date.now() + TIMEOUT_MS;

for (const target of targets) {
  process.stderr.write(`Waiting for ${target.label}...\n`);
  while (Date.now() < deadline) {
    if (await canConnect(target.host, target.port)) {
      process.stderr.write(`Ready: ${target.label}\n`);
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
  }

  if (!(await canConnect(target.host, target.port))) {
    console.error(`Timed out waiting for ${target.label}`);
    process.exit(1);
  }
}
