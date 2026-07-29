#!/usr/bin/env node
/**
 * Validate tenant locale packs for key parity (and optionally empty translations).
 *
 * Usage:
 *   pnpm locale-packs:validate
 *   pnpm locale-packs:validate -- --strict
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { parseLocalePackJson } from "@repo/locale-packs";
import { harvestCatalogMessages } from "@repo/locale-packs/harvest";

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseArgs(argv: string[]): {
  catalogsDir: string;
  strict: boolean;
  refLocale: string;
} {
  let catalogsDir = resolve(
    __dirname,
    "../.local/tenant-import/catalogs",
  );
  let strict = false;
  let refLocale = "en";

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--catalogs" && argv[i + 1]) {
      catalogsDir = resolve(argv[i + 1]!);
      i += 1;
    } else if (arg === "--strict") {
      strict = true;
    } else if (arg === "--ref" && argv[i + 1]) {
      refLocale = argv[i + 1]!;
      i += 1;
    }
  }

  return { catalogsDir, strict, refLocale };
}

function loadPack(filePath: string): {
  locale: string;
  messages: Record<string, string>;
} {
  const parsed = parseLocalePackJson(readFileSync(filePath, "utf8"));
  if (!parsed.ok) {
    throw new Error(
      `Invalid locale pack ${filePath}: ${parsed.errors.map((e) => e.message).join("; ")}`,
    );
  }
  return {
    locale: parsed.data.locale,
    messages: { ...parsed.data.messages },
  };
}

function main(): void {
  const { catalogsDir, strict, refLocale } = parseArgs(process.argv.slice(2));
  const packsDir = join(catalogsDir, "locale-packs");
  if (!existsSync(packsDir)) {
    console.error(`Locale packs directory not found: ${packsDir}`);
    process.exit(1);
  }

  const packFiles = readdirSync(packsDir)
    .filter((name) => name.endsWith(".json") && !name.startsWith("_"))
    .sort();
  if (packFiles.length === 0) {
    console.error("No locale pack files found.");
    process.exit(1);
  }

  const packs = packFiles.map((name) => loadPack(join(packsDir, name)));
  const ref = packs.find((pack) => pack.locale === refLocale);
  if (!ref) {
    console.error(`Reference locale pack "${refLocale}" not found.`);
    process.exit(1);
  }

  const refKeys = new Set(Object.keys(ref.messages));
  const harvested = harvestCatalogMessages(catalogsDir);
  const harvestedKeys = new Set(Object.keys(harvested));

  let failed = false;

  for (const pack of packs) {
    const keys = new Set(Object.keys(pack.messages));
    const missing = [...refKeys].filter((key) => !keys.has(key));
    const extra = [...keys].filter((key) => !refKeys.has(key));
    if (missing.length > 0 || extra.length > 0) {
      failed = true;
      console.error(
        `[parity] ${pack.locale}: missing=${missing.length} extra=${extra.length}`,
      );
      for (const key of missing.slice(0, 20)) {
        console.error(`  - missing ${key}`);
      }
      for (const key of extra.slice(0, 20)) {
        console.error(`  - extra ${key}`);
      }
    }

    if (pack.locale !== refLocale) {
      const emptyKeys = [...keys].filter(
        (key) => !pack.messages[key] || !pack.messages[key]!.trim(),
      );
      if (emptyKeys.length > 0) {
        const message = `[empty] ${pack.locale}: ${emptyKeys.length} untranslated key(s)`;
        if (strict) {
          failed = true;
          console.error(message);
          for (const key of emptyKeys.slice(0, 40)) {
            console.error(`  - ${key}`);
          }
        } else {
          console.warn(message);
        }
      }
    }
  }

  const unused = [...refKeys].filter((key) => !harvestedKeys.has(key));
  const missingFromPack = [...harvestedKeys].filter((key) => !refKeys.has(key));
  if (unused.length > 0) {
    const message = `[unused] ${refLocale}: ${unused.length} key(s) not in current catalogs`;
    if (strict) {
      failed = true;
      console.error(message);
    } else {
      console.warn(message);
    }
  }
  if (missingFromPack.length > 0) {
    failed = true;
    console.error(
      `[stale] ${refLocale}: ${missingFromPack.length} harvested key(s) missing from pack — run locale-packs:extract`,
    );
    for (const key of missingFromPack.slice(0, 20)) {
      console.error(`  - ${key}`);
    }
  }

  if (failed) {
    process.exit(1);
  }

  console.log(
    `Locale packs OK (${packs.map((p) => p.locale).join(", ")}; ${refKeys.size} keys)`,
  );
}

main();
