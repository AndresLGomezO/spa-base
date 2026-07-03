import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMissingPrecacheEntries,
  isServiceWorkerPrecachePatched,
  patchServiceWorkerPrecache,
} from "./fix-service-worker.mjs";

test("buildMissingPrecacheEntries includes index.html and manifest assets", () => {
  const source =
    'workbox.precacheAndRoute([{url:"/assets/app.js",revision:"abc"}]);';
  const entries = buildMissingPrecacheEntries({
    source,
    indexHtml: Buffer.from("<!doctype html><html></html>"),
    assetFiles: ["manifest-abc123.js", "app.js"],
  });

  assert.equal(entries.length, 2);
  assert.match(entries[0], /^\{url:"\/index\.html",revision:"[a-f0-9]{32}"\}$/);
  assert.equal(entries[1], '{url:"/assets/manifest-abc123.js",revision:null}');
});

test("patchServiceWorkerPrecache inserts entries at precache manifest start", () => {
  const source =
    'workbox.precacheAndRoute([{url:"/assets/app.js",revision:"abc"}]);';
  const patched = patchServiceWorkerPrecache(source, [
    '{url:"/index.html",revision:"deadbeef"}',
  ]);

  assert.match(
    patched,
    /precacheAndRoute\(\[\{url:"\/index\.html",revision:"deadbeef"\},\{url:"\/assets\/app\.js",revision:"abc"\}\]/,
  );
});

test("isServiceWorkerPrecachePatched detects existing index.html entry", () => {
  assert.equal(
    isServiceWorkerPrecachePatched(
      'precacheAndRoute([{url:"/index.html",revision:"abc"}]);',
    ),
    true,
  );
  assert.equal(
    isServiceWorkerPrecachePatched(
      'precacheAndRoute([{url:"/assets/app.js",revision:"abc"}]);',
    ),
    false,
  );
});
