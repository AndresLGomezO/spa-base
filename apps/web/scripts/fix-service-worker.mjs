import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const INDEX_PRECACHE_URL = "/index.html";

function findPrecacheInsertPoint(source) {
  const classic = source.match(/\.precacheAndRoute\(\[/);
  if (classic && classic.index !== undefined) {
    return classic.index + classic[0].length;
  }

  // injectManifest bundles Workbox with mangled names, e.g.:
  // Ne([{"revision":"...","url":"manifest.webmanifest"},...]),Ce(new Pe(je(`/index.html`),...
  const navigationMarker = source.includes("`/index.html`")
    ? "`/index.html`"
    : source.includes('"/index.html"')
      ? '"/index.html"'
      : null;
  if (!navigationMarker) {
    return null;
  }

  const navigationAt = source.indexOf(navigationMarker);
  const beforeNavigation = source.slice(0, navigationAt);
  const revisionArray = /\[\s*\{\s*"revision"\s*:/g;
  let lastMatch = null;
  let match;
  while ((match = revisionArray.exec(beforeNavigation)) !== null) {
    lastMatch = match;
  }
  if (!lastMatch || lastMatch.index === undefined) {
    return null;
  }
  // Insert after the opening `[`
  return lastMatch.index + 1;
}

export function isServiceWorkerPrecachePatched(source) {
  return (
    source.includes(`{url:"${INDEX_PRECACHE_URL}",`) ||
    source.includes(`"url":"${INDEX_PRECACHE_URL}"`) ||
    source.includes(`"url":"index.html"`) ||
    source.includes(`{url:"index.html",`)
  );
}

export function buildMissingPrecacheEntries({
  source,
  indexHtml,
  assetFiles = [],
}) {
  const entries = [];

  if (indexHtml !== undefined && !isServiceWorkerPrecachePatched(source)) {
    const indexRevision = createHash("md5").update(indexHtml).digest("hex");
    // Match injectManifest object key order when the SW is bundled.
    if (source.includes('"revision":') && source.includes('"url":')) {
      entries.push(
        `{"revision":"${indexRevision}","url":"${INDEX_PRECACHE_URL}"}`,
      );
    } else {
      entries.push(`{url:"${INDEX_PRECACHE_URL}",revision:"${indexRevision}"}`);
    }
  }

  for (const file of assetFiles) {
    if (!file.startsWith("manifest-") || !file.endsWith(".js")) {
      continue;
    }

    const assetUrl = `/assets/${file}`;
    if (source.includes(assetUrl) || source.includes(`"url":"${file}"`)) {
      continue;
    }

    if (source.includes('"revision":') && source.includes('"url":')) {
      entries.push(`{"revision":null,"url":"${assetUrl}"}`);
    } else {
      entries.push(`{url:"${assetUrl}",revision:null}`);
    }
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
