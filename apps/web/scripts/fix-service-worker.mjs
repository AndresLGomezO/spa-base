import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const INDEX_PRECACHE_URL = "/index.html";

function findPrecacheInsertPoint(source) {
  const match = source.match(/\.precacheAndRoute\(\[/);
  if (!match || match.index === undefined) {
    return null;
  }
  return match.index + match[0].length;
}

export function isServiceWorkerPrecachePatched(source) {
  return source.includes(`{url:"${INDEX_PRECACHE_URL}",`);
}

export function buildMissingPrecacheEntries({
  source,
  indexHtml,
  assetFiles = [],
}) {
  const entries = [];

  if (indexHtml !== undefined) {
    const indexRevision = createHash("md5").update(indexHtml).digest("hex");
    entries.push(`{url:"${INDEX_PRECACHE_URL}",revision:"${indexRevision}"}`);
  }

  for (const file of assetFiles) {
    if (!file.startsWith("manifest-") || !file.endsWith(".js")) {
      continue;
    }

    const assetUrl = `/assets/${file}`;
    if (source.includes(assetUrl)) {
      continue;
    }

    entries.push(`{url:"${assetUrl}",revision:null}`);
  }

  return entries;
}

export function patchServiceWorkerPrecache(source, entries) {
  if (entries.length === 0) {
    return source;
  }

  const insertAt = findPrecacheInsertPoint(source);
  if (insertAt === null) {
    throw new Error("Could not find precacheAndRoute([ in sw.js");
  }

  return `${source.slice(0, insertAt)}${entries.join(",")},${source.slice(insertAt)}`;
}

export function fixServiceWorkerAtPath(clientDir) {
  const swPath = path.join(clientDir, "sw.js");
  const indexPath = path.join(clientDir, "index.html");

  if (!existsSync(swPath)) {
    return { status: "skipped", reason: "sw.js not found" };
  }

  const source = readFileSync(swPath, "utf8");
  if (isServiceWorkerPrecachePatched(source)) {
    return { status: "skipped", reason: "already patched" };
  }

  const assetFiles = existsSync(path.join(clientDir, "assets"))
    ? readdirSync(path.join(clientDir, "assets"))
    : [];

  const entries = buildMissingPrecacheEntries({
    source,
    indexHtml: existsSync(indexPath) ? readFileSync(indexPath) : undefined,
    assetFiles,
  });

  if (entries.length === 0) {
    return { status: "skipped", reason: "no entries to add" };
  }

  writeFileSync(swPath, patchServiceWorkerPrecache(source, entries), "utf8");

  return { status: "patched", entriesAdded: entries.length };
}

function main() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const clientDir = path.resolve(scriptDir, "../build/client");
  const result = fixServiceWorkerAtPath(clientDir);

  if (result.status === "patched") {
    console.log(
      `fix-service-worker: added ${result.entriesAdded} precache entr${result.entriesAdded === 1 ? "y" : "ies"}`,
    );
    return;
  }

  console.log(`fix-service-worker: ${result.reason}, skipping`);
}

const isMainModule =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isMainModule) {
  main();
}
