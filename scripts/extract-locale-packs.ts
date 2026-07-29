#!/usr/bin/env node
/**
 * Extract tenant catalog user-facing strings into locale packs.
 *
 * Usage:
 *   pnpm locale-packs:extract
 *   pnpm locale-packs:extract -- --catalogs /path/to/catalogs
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  createLocalePackEnvelope,
  parseLocalePackJson,
} from "@repo/locale-packs";
import {
  harvestCatalogMessages,
  mergeLocaleMessages,
} from "@repo/locale-packs/harvest";

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseArgs(argv: string[]): {
  catalogsDir: string;
  mirrorLocales: string[];
} {
  let catalogsDir = resolve(
    __dirname,
    "../.local/tenant-import/catalogs",
  );
  const mirrorLocales = ["es"];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--catalogs" && argv[i + 1]) {
      catalogsDir = resolve(argv[i + 1]!);
      i += 1;
    } else if (arg === "--mirror" && argv[i + 1]) {
      mirrorLocales.length = 0;
      mirrorLocales.push(
        ...argv[i + 1]!.split(",").map((part) => part.trim()).filter(Boolean),
      );
      i += 1;
    }
  }

  return { catalogsDir, mirrorLocales };
}

function readExistingMessages(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) return {};
  const parsed = parseLocalePackJson(readFileSync(filePath, "utf8"));
  if (!parsed.ok) return {};
  return { ...parsed.data.messages };
}

function writePack(
  filePath: string,
  locale: string,
  messages: Record<string, string>,
): void {
  mkdirSync(dirname(filePath), { recursive: true });
  const envelope = createLocalePackEnvelope({ locale, messages });
  writeFileSync(`${filePath}`, `${JSON.stringify(envelope, null, 2)}\n`, "utf8");
}

function main(): void {
  const { catalogsDir, mirrorLocales } = parseArgs(process.argv.slice(2));
  const packsDir = join(catalogsDir, "locale-packs");
  const harvested = harvestCatalogMessages(catalogsDir);
  const enPath = join(packsDir, "en.json");
  const enMessages = mergeLocaleMessages({
    harvested,
    existing: readExistingMessages(enPath),
    mode: "en",
  });
  writePack(enPath, "en", enMessages);

  for (const locale of mirrorLocales) {
    if (locale === "en") continue;
    const path = join(packsDir, `${locale}.json`);
    const messages = mergeLocaleMessages({
      harvested,
      existing: readExistingMessages(path),
      mode: "mirror",
    });
    writePack(path, locale, messages);
  }

  console.log(
    `Extracted ${Object.keys(enMessages).length} keys into ${packsDir} (mirrors: ${mirrorLocales.filter((l) => l !== "en").join(", ") || "none"})`,
  );
}

main();
