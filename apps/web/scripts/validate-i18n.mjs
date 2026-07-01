#!/usr/bin/env node

/**
 * validate-i18n.mjs
 *
 * i18n validation:
 *   1. Key Parity      — every locale must mirror the reference locale's keys exactly.
 *   2. Unused Keys      — keys/namespaces defined in JSON but never referenced in source.
 *   3. Missing Keys     — keys referenced in source but not defined in reference locale JSON.
 *
 * Usage:
 *   node scripts/validate-i18n.mjs            # unused = warning only
 *   node scripts/validate-i18n.mjs --strict   # unused = hard error (exit 1)
 *
 * Exit codes:  0 = pass, 1 = failure
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = path.resolve(__dirname, "../app/i18n/locales");
const SRC_DIR = path.resolve(__dirname, "../app");
const REF_LOCALE = "en";
const DEFAULT_NAMESPACE = "common";
const STRICT = process.argv.includes("--strict");

const UNUSED_IGNORE = [];
const MISSING_IGNORE = [];

function flattenKeys(obj, prefix = "") {
  const keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      keys.push(...flattenKeys(v, full));
    } else {
      keys.push(full);
    }
  }
  return keys.sort();
}

function walk(dir, exts, skip = []) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (skip.some((s) => full.includes(s)) || e.name === "node_modules") {
        continue;
      }
      out.push(...walk(full, exts, skip));
    } else if (exts.some((x) => e.name.endsWith(x))) {
      out.push(full);
    }
  }
  return out;
}

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

function getLocales() {
  return fs
    .readdirSync(LOCALES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

function getNamespaces(locale) {
  return fs
    .readdirSync(path.join(LOCALES_DIR, locale))
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(".json", ""))
    .sort();
}

function buildRefKeySet() {
  const refDir = path.join(LOCALES_DIR, REF_LOCALE);
  const namespaces = getNamespaces(REF_LOCALE);
  const keySet = new Set();

  for (const ns of namespaces) {
    const keys = flattenKeys(readJSON(path.join(refDir, `${ns}.json`)));
    for (const key of keys) {
      keySet.add(`${ns}:${key}`);
    }
  }
  return { keySet, namespaces };
}

function loadSourceCorpus() {
  const srcFiles = walk(
    SRC_DIR,
    [".ts", ".tsx", ".js", ".jsx"],
    [path.join("i18n", "locales"), "dist"],
  );
  const files = srcFiles.map((f) => ({
    path: f,
    content: fs.readFileSync(f, "utf-8"),
  }));
  const corpus = files.map((f) => f.content).join("\n");
  return { corpus, files };
}

function extractUsedKeys(files, namespaces) {
  const nsSet = new Set(namespaces);
  const usedKeys = new Map();

  function addKey(raw, filePath) {
    if (!raw || raw.includes("${") || raw.includes("{{")) return;

    let qualified;
    if (raw.includes(":")) {
      qualified = raw;
    } else {
      qualified = `${DEFAULT_NAMESPACE}:${raw}`;
    }

    if (!usedKeys.has(qualified)) usedKeys.set(qualified, new Set());
    usedKeys.get(qualified).add(filePath);
  }

  const patterns = [
    /\bt\s*\(\s*(['"`])([^'"`$\n]+?)\1/g,
    /i18nKey\s*=\s*{?\s*(['"`])([^'"`$\n]+?)\1/g,
  ];

  for (const file of files) {
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(file.content)) !== null) {
        addKey(match[2], file.path);
      }
    }

    const arrayPattern = /\bt\s*\(\s*\[([^\]]+)\]/g;
    let arrMatch;
    while ((arrMatch = arrayPattern.exec(file.content)) !== null) {
      const inner = arrMatch[1];
      for (const m of inner.matchAll(/(['"`])([^'"`$\n]+?)\1/g)) {
        addKey(m[2], file.path);
      }
    }

    const nsPattern = /useTranslation\s*\(\s*(['"`])([^'"`\n]+?)\1/g;
    const fileNamespaces = [];
    let nsMatch;
    while ((nsMatch = nsPattern.exec(file.content)) !== null) {
      if (nsSet.has(nsMatch[2])) fileNamespaces.push(nsMatch[2]);
    }

    const nsArrayPattern = /useTranslation\s*\(\s*\[([^\]]+)\]/g;
    let nsArrMatch;
    while ((nsArrMatch = nsArrayPattern.exec(file.content)) !== null) {
      for (const m of nsArrMatch[1].matchAll(/(['"`])([^'"`\n]+?)\1/g)) {
        if (nsSet.has(m[2])) fileNamespaces.push(m[2]);
      }
    }

    if (fileNamespaces.length > 0) {
      const tPattern = /\bt\s*\(\s*(['"`])([^'"`$\n]+?)\1/g;
      let tMatch;
      while ((tMatch = tPattern.exec(file.content)) !== null) {
        const raw = tMatch[2];
        if (!raw || raw.includes("${") || raw.includes("{{")) continue;
        if (!raw.includes(":")) {
          for (const ns of fileNamespaces) {
            const qualified = `${ns}:${raw}`;
            if (!usedKeys.has(qualified)) usedKeys.set(qualified, new Set());
            usedKeys.get(qualified).add(file.path);
          }
        }
      }
    }
  }

  return usedKeys;
}

/** labelKey values in source → common:nav.{labelKey} */
function extractNavLabelKeys(files) {
  const keys = new Set();
  for (const file of files) {
    for (const match of file.content.matchAll(/labelKey:\s*"([^"]+)"/g)) {
      const labelKey = match[1];
      if (labelKey.includes(".")) {
        continue;
      }
      keys.add(`${DEFAULT_NAMESPACE}:nav.${labelKey}`);
    }
  }
  return [...keys];
}

/** navLabelKey values in entity-catalog.ts → common:nav.{navLabelKey} */
function extractEntityNavKeys(files) {
  const entityCatalog = files.find((f) => f.path.endsWith("entity-catalog.ts"));
  if (!entityCatalog) return [];

  const keys = new Set();
  for (const match of entityCatalog.content.matchAll(
    /navLabelKey:\s*"([^"]+)"/g,
  )) {
    keys.add(`${DEFAULT_NAMESPACE}:nav.${match[1]}`);
  }
  return [...keys];
}

/** roles.${roleKey} in source → all keys under roles in reference locale */
function extractDynamicRoleKeys(corpus, namespaces) {
  if (!corpus.includes("roles.${")) return [];

  const refRoles = readJSON(
    path.join(LOCALES_DIR, REF_LOCALE, `${DEFAULT_NAMESPACE}.json`),
  ).roles;

  if (!refRoles || typeof refRoles !== "object") return [];

  return Object.keys(refRoles).map(
    (key) => `${DEFAULT_NAMESPACE}:roles.${key}`,
  );
}

/** dataModels.fieldTypes.${type} in source → all keys under dataModels.fieldTypes */
function extractDataModelFieldTypeKeys(corpus) {
  if (!corpus.includes("dataModels.fieldTypes.${")) return [];

  const refDataModels = readJSON(
    path.join(LOCALES_DIR, REF_LOCALE, `${DEFAULT_NAMESPACE}.json`),
  ).dataModels;

  const fieldTypes = refDataModels?.fieldTypes;
  if (!fieldTypes || typeof fieldTypes !== "object") return [];

  return Object.keys(fieldTypes).map(
    (key) => `${DEFAULT_NAMESPACE}:dataModels.fieldTypes.${key}`,
  );
}

/** dataHooks.<group>.${...} in source → all keys under dataHooks.<group> */
function extractDataHookDynamicKeys(corpus) {
  const groups = [
    "operation",
    "phase",
    "actionType",
    "condition",
    "execution",
    "triggerKind",
    "scheduleScope",
  ];
  const refDataHooks = readJSON(
    path.join(LOCALES_DIR, REF_LOCALE, `${DEFAULT_NAMESPACE}.json`),
  ).dataHooks;

  const keys = [];
  for (const group of groups) {
    if (!corpus.includes(`dataHooks.${group}.\${`)) continue;
    const bucket = refDataHooks?.[group];
    if (!bucket || typeof bucket !== "object") continue;
    for (const key of Object.keys(bucket)) {
      keys.push(`${DEFAULT_NAMESPACE}:dataHooks.${group}.${key}`);
    }
  }

  if (corpus.includes("dataHooks.actions.aggregateOps.\${")) {
    const aggregateOps = refDataHooks?.actions?.aggregateOps;
    if (aggregateOps && typeof aggregateOps === "object") {
      for (const key of Object.keys(aggregateOps)) {
        keys.push(`${DEFAULT_NAMESPACE}:dataHooks.actions.aggregateOps.${key}`);
      }
    }
  }

  return keys;
}

/** dataHooks.expression.{operators|functions|dateUnits}.* via helper key builders */
function extractExpressionDynamicKeys(corpus) {
  if (
    !corpus.includes("dataHooks.expression.operators.") &&
    !corpus.includes("dataHooks.expression.functions.") &&
    !corpus.includes("dataHooks.expression.dateUnits.")
  ) {
    return [];
  }

  const refExpression = readJSON(
    path.join(LOCALES_DIR, REF_LOCALE, `${DEFAULT_NAMESPACE}.json`),
  ).dataHooks?.expression;

  if (!refExpression || typeof refExpression !== "object") return [];

  const keys = [];
  for (const [group, bucket] of Object.entries({
    "operators.binary": refExpression.operators?.binary,
    "operators.unary": refExpression.operators?.unary,
    functions: refExpression.functions,
    dateUnits: refExpression.dateUnits,
  })) {
    if (!bucket || typeof bucket !== "object") continue;
    for (const key of Object.keys(bucket)) {
      keys.push(`${DEFAULT_NAMESPACE}:dataHooks.expression.${group}.${key}`);
    }
  }
  return keys;
}

/** dataModels.relationTypes.${key}.* in source → nested keys under dataModels.relationTypes */
function extractDataModelRelationTypeKeys(corpus) {
  if (!corpus.includes("dataModels.relationTypes.${")) return [];

  const refDataModels = readJSON(
    path.join(LOCALES_DIR, REF_LOCALE, `${DEFAULT_NAMESPACE}.json`),
  ).dataModels;

  const relationTypes = refDataModels?.relationTypes;
  if (!relationTypes || typeof relationTypes !== "object") return [];

  const keys = [];
  for (const [typeKey, value] of Object.entries(relationTypes)) {
    if (typeKey === "exampleLabel") continue;
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    for (const subKey of Object.keys(value)) {
      keys.push(
        `${DEFAULT_NAMESPACE}:dataModels.relationTypes.${typeKey}.${subKey}`,
      );
    }
  }
  return keys;
}

/** platform.appearance.groups.${groupKey} in source → all keys under platform.appearance.groups */
function extractAppearanceGroupKeys(corpus) {
  if (!corpus.includes("platform.appearance.groups.${")) return [];

  const refPlatform = readJSON(
    path.join(LOCALES_DIR, REF_LOCALE, `${DEFAULT_NAMESPACE}.json`),
  ).platform;

  const groups = refPlatform?.appearance?.groups;
  if (!groups || typeof groups !== "object") return [];

  return Object.keys(groups).map(
    (key) => `${DEFAULT_NAMESPACE}:platform.appearance.groups.${key}`,
  );
}

/** entity.viewSettings.badgeVariant.${variant} in source → all keys under entity.viewSettings.badgeVariant */
function extractBadgeVariantKeys(corpus) {
  if (!corpus.includes("entity.viewSettings.badgeVariant.${")) return [];

  const refEntity = readJSON(
    path.join(LOCALES_DIR, REF_LOCALE, `${DEFAULT_NAMESPACE}.json`),
  ).entity;

  const badgeVariant = refEntity?.viewSettings?.badgeVariant;
  if (!badgeVariant || typeof badgeVariant !== "object") return [];

  return Object.keys(badgeVariant).map(
    (key) => `${DEFAULT_NAMESPACE}:entity.viewSettings.badgeVariant.${key}`,
  );
}

/** platform.appearance.presets.${presetId} in source → all keys under platform.appearance.presets */
function extractAppearancePresetKeys(corpus) {
  if (!corpus.includes("platform.appearance.presets.${")) return [];

  const refPlatform = readJSON(
    path.join(LOCALES_DIR, REF_LOCALE, `${DEFAULT_NAMESPACE}.json`),
  ).platform;

  const presets = refPlatform?.appearance?.presets;
  if (!presets || typeof presets !== "object") return [];

  return Object.keys(presets).map(
    (key) => `${DEFAULT_NAMESPACE}:platform.appearance.presets.${key}`,
  );
}

/** metrics.fieldHelp.${fieldKey}.* in source → nested keys under metrics.fieldHelp */
function extractMetricsFieldHelpKeys(corpus) {
  if (!corpus.includes("metrics.fieldHelp.${")) return [];

  const refMetrics = readJSON(
    path.join(LOCALES_DIR, REF_LOCALE, `${DEFAULT_NAMESPACE}.json`),
  ).metrics;

  const fieldHelp = refMetrics?.fieldHelp;
  if (!fieldHelp || typeof fieldHelp !== "object") return [];

  const keys = [];
  for (const [fieldKey, value] of Object.entries(fieldHelp)) {
    if (fieldKey === "infoLabel" || fieldKey === "exampleLabel") continue;
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    for (const subKey of Object.keys(value)) {
      keys.push(`${DEFAULT_NAMESPACE}:metrics.fieldHelp.${fieldKey}.${subKey}`);
    }
  }
  return keys;
}

/** metrics.operations.${operation} in source → all keys under metrics.operations */
function extractMetricsOperationKeys(corpus) {
  if (!corpus.includes("metrics.operations.${")) return [];

  const refMetrics = readJSON(
    path.join(LOCALES_DIR, REF_LOCALE, `${DEFAULT_NAMESPACE}.json`),
  ).metrics;

  const operations = refMetrics?.operations;
  if (!operations || typeof operations !== "object") return [];

  return Object.keys(operations).map(
    (key) => `${DEFAULT_NAMESPACE}:metrics.operations.${key}`,
  );
}

/** entity.viewSettings.metrics.binding.${bindingType} in source → keys under entity.viewSettings.metrics.binding */
function extractEntityViewMetricsBindingKeys(corpus) {
  if (!corpus.includes("entity.viewSettings.metrics.binding.${")) return [];

  const refEntity = readJSON(
    path.join(LOCALES_DIR, REF_LOCALE, `${DEFAULT_NAMESPACE}.json`),
  ).entity;

  const binding = refEntity?.viewSettings?.metrics?.binding;
  if (!binding || typeof binding !== "object") return [];

  return Object.keys(binding).map(
    (key) => `${DEFAULT_NAMESPACE}:entity.viewSettings.metrics.binding.${key}`,
  );
}

/** designLayout.presets.kind.${kind} in source → all keys under designLayout.presets.kind */
function extractUiBuilderPresetKindKeys(corpus) {
  if (!corpus.includes("designLayout.presets.kind.${")) return [];

  const refDesignLayout = readJSON(
    path.join(LOCALES_DIR, REF_LOCALE, `${DEFAULT_NAMESPACE}.json`),
  ).designLayout;

  const kinds = refDesignLayout?.presets?.kind;
  if (!kinds || typeof kinds !== "object") return [];

  return Object.keys(kinds).map(
    (key) => `${DEFAULT_NAMESPACE}:designLayout.presets.kind.${key}`,
  );
}

/** formDesigner.previewDevices.* in source → keys under formDesigner.previewDevices */
function extractFormDesignerPreviewDeviceKeys(corpus) {
  const needsBrands = corpus.includes("formDesigner.previewDevices.brands.${");
  const needsDevices = corpus.includes(
    'labelKey: "formDesigner.previewDevices.',
  );
  if (!needsBrands && !needsDevices) return [];

  const refFormDesigner = readJSON(
    path.join(LOCALES_DIR, REF_LOCALE, `${DEFAULT_NAMESPACE}.json`),
  ).formDesigner;

  const previewDevices = refFormDesigner?.previewDevices;
  if (!previewDevices || typeof previewDevices !== "object") return [];

  const keys = [];
  for (const [key, value] of Object.entries(previewDevices)) {
    if (key === "brands" && value && typeof value === "object") {
      if (needsBrands) {
        for (const brandKey of Object.keys(value)) {
          keys.push(
            `${DEFAULT_NAMESPACE}:formDesigner.previewDevices.brands.${brandKey}`,
          );
        }
      }
      continue;
    }

    if (needsDevices && typeof value === "string") {
      keys.push(`${DEFAULT_NAMESPACE}:formDesigner.previewDevices.${key}`);
    }
  }
  return keys;
}

/** metrics.dateGranularity.formats|options.${granularity} in source → keys under those objects */
function extractMetricsDateGranularityKeys(corpus) {
  const needsFormats = corpus.includes("metrics.dateGranularity.formats.${");
  const needsOptions = corpus.includes("metrics.dateGranularity.options.${");
  if (!needsFormats && !needsOptions) return [];

  const refMetrics = readJSON(
    path.join(LOCALES_DIR, REF_LOCALE, `${DEFAULT_NAMESPACE}.json`),
  ).metrics;

  const dateGranularity = refMetrics?.dateGranularity;
  if (!dateGranularity || typeof dateGranularity !== "object") return [];

  const keys = [];
  if (needsFormats) {
    const formats = dateGranularity.formats;
    if (formats && typeof formats === "object") {
      for (const key of Object.keys(formats)) {
        keys.push(
          `${DEFAULT_NAMESPACE}:metrics.dateGranularity.formats.${key}`,
        );
      }
    }
  }
  if (needsOptions) {
    const options = dateGranularity.options;
    if (options && typeof options === "object") {
      for (const key of Object.keys(options)) {
        keys.push(
          `${DEFAULT_NAMESPACE}:metrics.dateGranularity.options.${key}`,
        );
      }
    }
  }
  return keys;
}

/** metrics.derivedKpi.operators|insertOperator.${operator} in source → keys under those objects */
function extractMetricDerivedKpiOperatorKeys(corpus) {
  const needsOperators = corpus.includes("metrics.derivedKpi.operators.${");
  const needsInsertOperator = corpus.includes(
    "metrics.derivedKpi.insertOperator.${",
  );
  if (!needsOperators && !needsInsertOperator) return [];

  const refMetrics = readJSON(
    path.join(LOCALES_DIR, REF_LOCALE, `${DEFAULT_NAMESPACE}.json`),
  ).metrics;

  const derivedKpi = refMetrics?.derivedKpi;
  if (!derivedKpi || typeof derivedKpi !== "object") return [];

  const keys = [];
  if (needsOperators) {
    const operators = derivedKpi.operators;
    if (operators && typeof operators === "object") {
      for (const key of Object.keys(operators)) {
        keys.push(`${DEFAULT_NAMESPACE}:metrics.derivedKpi.operators.${key}`);
      }
    }
  }
  if (needsInsertOperator) {
    const insertOperator = derivedKpi.insertOperator;
    if (insertOperator && typeof insertOperator === "object") {
      for (const key of Object.keys(insertOperator)) {
        keys.push(
          `${DEFAULT_NAMESPACE}:metrics.derivedKpi.insertOperator.${key}`,
        );
      }
    }
  }
  return keys;
}

/** queryBuilder.filters.operators|temporalPresets.${...} in source → keys under those objects */
function extractQueryBuilderFilterDynamicKeys(corpus) {
  const needsOperators = corpus.includes("queryBuilder.filters.operators.${");
  const needsTemporalPresets = corpus.includes(
    "queryBuilder.filters.temporalPresets.${",
  );
  if (!needsOperators && !needsTemporalPresets) return [];

  const refQueryBuilder = readJSON(
    path.join(LOCALES_DIR, REF_LOCALE, `${DEFAULT_NAMESPACE}.json`),
  ).queryBuilder;

  const filters = refQueryBuilder?.filters;
  if (!filters || typeof filters !== "object") return [];

  const keys = [];
  if (needsOperators) {
    const operators = filters.operators;
    if (operators && typeof operators === "object") {
      for (const key of Object.keys(operators)) {
        keys.push(`${DEFAULT_NAMESPACE}:queryBuilder.filters.operators.${key}`);
      }
    }
  }
  if (needsTemporalPresets) {
    const temporalPresets = filters.temporalPresets;
    if (temporalPresets && typeof temporalPresets === "object") {
      for (const key of Object.keys(temporalPresets)) {
        keys.push(
          `${DEFAULT_NAMESPACE}:queryBuilder.filters.temporalPresets.${key}`,
        );
      }
    }
  }
  return keys;
}

/** translationPrefix / key("suffix") in ui-builder-ai → keys under formDesigner.ai / itemListDesigner.ai */
function extractUiBuilderAiDesignerKeys(corpus) {
  const needsFormDesigner =
    corpus.includes('TRANSLATION_PREFIX = "formDesigner.ai"') ||
    corpus.includes('translationPrefix = "formDesigner.ai"') ||
    corpus.includes("translationPrefix={TRANSLATION_PREFIX}");
  const needsItemListDesigner =
    corpus.includes('translationPrefix = "itemListDesigner.ai"') ||
    corpus.includes("itemListDesigner.ai.");

  if (!needsFormDesigner && !needsItemListDesigner) {
    return [];
  }

  const refCommon = readJSON(
    path.join(LOCALES_DIR, REF_LOCALE, `${DEFAULT_NAMESPACE}.json`),
  );
  const keys = [];

  if (needsFormDesigner && refCommon.formDesigner?.ai) {
    keys.push(...flattenKeys(refCommon.formDesigner.ai, "formDesigner.ai"));
  }
  if (needsItemListDesigner && refCommon.itemListDesigner?.ai) {
    keys.push(
      ...flattenKeys(refCommon.itemListDesigner.ai, "itemListDesigner.ai"),
    );
  }

  return keys.map((key) => `${DEFAULT_NAMESPACE}:${key}`);
}

/** aiDebugger.tabs.${item} in source → all keys under aiDebugger.tabs */
function extractAiDebuggerTabKeys(corpus) {
  if (!corpus.includes("aiDebugger.tabs.${")) return [];

  const refAiDebugger = readJSON(
    path.join(LOCALES_DIR, REF_LOCALE, `${DEFAULT_NAMESPACE}.json`),
  ).aiDebugger;

  const tabs = refAiDebugger?.tabs;
  if (!tabs || typeof tabs !== "object") return [];

  return Object.keys(tabs).map(
    (key) => `${DEFAULT_NAMESPACE}:aiDebugger.tabs.${key}`,
  );
}

function mergeUsedKeys(usedKeys, qualifiedKeys, filePath) {
  for (const qualified of qualifiedKeys) {
    if (!usedKeys.has(qualified)) usedKeys.set(qualified, new Set());
    usedKeys.get(qualified).add(filePath);
  }
}

function checkKeyParity() {
  const errors = [];
  const locales = getLocales();

  if (!locales.includes(REF_LOCALE)) {
    errors.push(`Reference locale "${REF_LOCALE}" not found in ${LOCALES_DIR}`);
    return errors;
  }
  if (locales.length < 2) {
    console.log("  ⚠  Single locale found — parity check skipped.\n");
    return [];
  }

  const refNS = getNamespaces(REF_LOCALE);
  const refDir = path.join(LOCALES_DIR, REF_LOCALE);

  for (const locale of locales.filter((l) => l !== REF_LOCALE)) {
    const locNS = getNamespaces(locale);
    const locDir = path.join(LOCALES_DIR, locale);

    for (const ns of refNS) {
      if (!locNS.includes(ns)) {
        errors.push(`[${locale}] Missing namespace file: ${ns}.json`);
      }
    }
    for (const ns of locNS) {
      if (!refNS.includes(ns)) {
        errors.push(
          `[${locale}] Extra namespace file not in "${REF_LOCALE}": ${ns}.json`,
        );
      }
    }

    for (const ns of refNS.filter((n) => locNS.includes(n))) {
      const refKeys = new Set(
        flattenKeys(readJSON(path.join(refDir, `${ns}.json`))),
      );
      const locKeys = new Set(
        flattenKeys(readJSON(path.join(locDir, `${ns}.json`))),
      );

      for (const k of refKeys) {
        if (!locKeys.has(k)) {
          errors.push(`[${locale}/${ns}.json] Missing key: "${k}"`);
        }
      }
      for (const k of locKeys) {
        if (!refKeys.has(k)) {
          errors.push(
            `[${locale}/${ns}.json] Extra key not in "${REF_LOCALE}": "${k}"`,
          );
        }
      }
    }
  }

  return errors;
}

function checkUnused(corpus, usedKeys, namespaces) {
  const warnings = [];
  const refDir = path.join(LOCALES_DIR, REF_LOCALE);
  const usedQualified = new Set(usedKeys.keys());

  for (const ns of namespaces) {
    const nsUsed =
      corpus.includes(`'${ns}'`) ||
      corpus.includes(`"${ns}"`) ||
      corpus.includes(`\`${ns}\``) ||
      corpus.includes(`'${ns}:`) ||
      corpus.includes(`"${ns}:`);

    if (!nsUsed) {
      warnings.push({
        type: "namespace",
        label: `[${ns}] Entire namespace appears unused`,
      });
    }
  }

  for (const ns of namespaces) {
    const keys = flattenKeys(readJSON(path.join(refDir, `${ns}.json`)));

    for (const key of keys) {
      const qualified = `${ns}:${key}`;

      if (
        UNUSED_IGNORE.some((p) => qualified.startsWith(p) || key.startsWith(p))
      ) {
        continue;
      }

      if (usedQualified.has(qualified)) continue;

      if (
        corpus.includes(`'${key}'`) ||
        corpus.includes(`"${key}"`) ||
        corpus.includes(`\`${key}\``) ||
        corpus.includes(`'${qualified}'`) ||
        corpus.includes(`"${qualified}"`) ||
        corpus.includes(`\`${qualified}\``)
      ) {
        continue;
      }

      warnings.push({ type: "key", label: `[${ns}] Unused key: "${key}"` });
    }
  }

  return warnings;
}

function checkMissing(usedKeys, refKeySet, namespaces) {
  const errors = [];
  const nsSet = new Set(namespaces);

  for (const [qualified, filePaths] of usedKeys) {
    if (MISSING_IGNORE.some((p) => qualified.startsWith(p))) continue;

    const colonIdx = qualified.indexOf(":");
    if (colonIdx === -1) continue;
    const ns = qualified.slice(0, colonIdx);
    const key = qualified.slice(colonIdx + 1);

    if (!nsSet.has(ns)) continue;

    if (!refKeySet.has(qualified)) {
      const fileList = [...filePaths]
        .map((f) => path.relative(SRC_DIR, f))
        .slice(0, 3);
      const suffix = filePaths.size > 3 ? ` (+${filePaths.size - 3} more)` : "";
      errors.push(
        `[${ns}] Missing key in ${REF_LOCALE}: "${key}"  ← used in ${fileList.join(", ")}${suffix}`,
      );
    }
  }

  return errors;
}

console.log("\n🌐  i18n Validation\n");
let exit = 0;

const { keySet: refKeySet, namespaces } = buildRefKeySet();
const { corpus, files } = loadSourceCorpus();
const usedKeys = extractUsedKeys(files, namespaces);
const navConfigFile =
  files.find((f) => f.path.endsWith("nav-config.ts"))?.path ?? SRC_DIR;
mergeUsedKeys(usedKeys, extractNavLabelKeys(files), navConfigFile);
const entityCatalogFile =
  files.find((f) => f.path.endsWith("entity-catalog.ts"))?.path ?? SRC_DIR;
mergeUsedKeys(usedKeys, extractEntityNavKeys(files), entityCatalogFile);
mergeUsedKeys(
  usedKeys,
  extractDynamicRoleKeys(corpus, namespaces),
  path.join(SRC_DIR, "components/sidebar/SidebarUser.tsx"),
);
mergeUsedKeys(
  usedKeys,
  extractDataModelFieldTypeKeys(corpus),
  path.join(SRC_DIR, "components/data-models/FieldEditor.tsx"),
);
mergeUsedKeys(
  usedKeys,
  extractDataModelRelationTypeKeys(corpus),
  path.join(SRC_DIR, "components/data-models/RelationTypeInfo.tsx"),
);
mergeUsedKeys(
  usedKeys,
  extractDataHookDynamicKeys(corpus),
  path.join(SRC_DIR, "features/data-hooks/DataHookSettingsPanel.tsx"),
);
mergeUsedKeys(
  usedKeys,
  extractExpressionDynamicKeys(corpus),
  path.join(SRC_DIR, "features/data-hooks/expression-editor-utils.ts"),
);
mergeUsedKeys(
  usedKeys,
  extractBadgeVariantKeys(corpus),
  path.join(SRC_DIR, "features/item-list-designer/ItemListDesignerView.tsx"),
);
const appearanceEditorFile = path.join(
  SRC_DIR,
  "components/platform/TenantAppearanceEditor.tsx",
);
mergeUsedKeys(
  usedKeys,
  extractAppearanceGroupKeys(corpus),
  appearanceEditorFile,
);
mergeUsedKeys(
  usedKeys,
  extractAppearancePresetKeys(corpus),
  appearanceEditorFile,
);
const metricsFieldHelpFile = path.join(
  SRC_DIR,
  "components/metrics/MetricFieldHelp.tsx",
);
mergeUsedKeys(
  usedKeys,
  extractMetricsFieldHelpKeys(corpus),
  metricsFieldHelpFile,
);
const metricsEditorFile = path.join(
  SRC_DIR,
  "components/metrics/MetricDefinitionEditor.tsx",
);
mergeUsedKeys(usedKeys, extractMetricsOperationKeys(corpus), metricsEditorFile);
const metricBindingEditorFile = path.join(
  SRC_DIR,
  "components/metrics/MetricBindingSourceEditor.tsx",
);
mergeUsedKeys(
  usedKeys,
  extractEntityViewMetricsBindingKeys(corpus),
  metricBindingEditorFile,
);
const dateGranularityPickerFile = path.join(
  SRC_DIR,
  "components/metrics/DateFieldGranularityPicker.tsx",
);
mergeUsedKeys(
  usedKeys,
  extractMetricsDateGranularityKeys(corpus),
  dateGranularityPickerFile,
);
const metricDerivedKpiEditorFile = path.join(
  SRC_DIR,
  "components/metrics/MetricDerivedKpiComponentEditor.tsx",
);
mergeUsedKeys(
  usedKeys,
  extractMetricDerivedKpiOperatorKeys(corpus),
  metricDerivedKpiEditorFile,
);
const entityQueryFilterGroupEditorFile = path.join(
  SRC_DIR,
  "components/entity/EntityQueryFilterGroupEditor.tsx",
);
mergeUsedKeys(
  usedKeys,
  extractQueryBuilderFilterDynamicKeys(corpus),
  entityQueryFilterGroupEditorFile,
);
const uiBuilderPresetManagerFile = path.join(
  SRC_DIR,
  "features/ui-builder/UiBuilderPresetManager.tsx",
);
mergeUsedKeys(
  usedKeys,
  extractUiBuilderPresetKindKeys(corpus),
  uiBuilderPresetManagerFile,
);
const formDesignerMobileDeviceSelectFile = path.join(
  SRC_DIR,
  "features/form-designer/FormDesignerMobileDeviceSelect.tsx",
);
mergeUsedKeys(
  usedKeys,
  extractFormDesignerPreviewDeviceKeys(corpus),
  formDesignerMobileDeviceSelectFile,
);
const uiBuilderAiRequestModalFile = path.join(
  SRC_DIR,
  "features/ui-builder-ai/UiBuilderAiRequestModal.tsx",
);
mergeUsedKeys(
  usedKeys,
  extractUiBuilderAiDesignerKeys(corpus),
  uiBuilderAiRequestModalFile,
);
const aiDebuggerViewFile = path.join(
  SRC_DIR,
  "features/ai-debugger/AiDebuggerView.tsx",
);
mergeUsedKeys(usedKeys, extractAiDebuggerTabKeys(corpus), aiDebuggerViewFile);

console.log("── 1. Key Parity ──────────────────────────────");
const parityErrs = checkKeyParity();
if (parityErrs.length) {
  console.log(`  ❌  ${parityErrs.length} error(s):\n`);
  parityErrs.forEach((e) => console.log(`     • ${e}`));
  exit = 1;
} else {
  console.log("  ✅  All locales have identical key structures.");
}

console.log("\n── 2. Unused Keys / Namespaces ────────────────");
const unused = checkUnused(corpus, usedKeys, namespaces);
const unusedNS = unused.filter((u) => u.type === "namespace");
const unusedKeysList = unused.filter((u) => u.type === "key");

if (unused.length) {
  const icon = STRICT ? "❌" : "⚠️ ";
  if (unusedNS.length) {
    console.log(
      `\n  ${icon} ${unusedNS.length} potentially unused namespace(s):\n`,
    );
    unusedNS.forEach((u) => console.log(`     • ${u.label}`));
  }
  if (unusedKeysList.length) {
    console.log(
      `\n  ${icon} ${unusedKeysList.length} potentially unused key(s):\n`,
    );
    unusedKeysList.forEach((u) => console.log(`     • ${u.label}`));
  }
  if (STRICT) exit = 1;
} else {
  console.log("  ✅  No unused keys or namespaces detected.");
}

console.log("\n── 3. Missing Keys (in code but not in JSON) ──");
const missingErrs = checkMissing(usedKeys, refKeySet, namespaces);
if (missingErrs.length) {
  console.log(
    `  ❌  ${missingErrs.length} key(s) used in code but not defined:\n`,
  );
  missingErrs.forEach((e) => console.log(`     • ${e}`));
  exit = 1;
} else {
  console.log("  ✅  All referenced keys exist in locale files.");
}

console.log("\n" + "─".repeat(50));
if (exit === 0) {
  console.log("  ✅  All i18n checks passed.\n");
} else {
  console.log("  ❌  i18n validation failed.\n");
}

process.exit(exit);
