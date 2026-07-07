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

/** dataHooks.preview.* dynamic template keys in hook preview UI */
function extractDataHookPreviewDynamicKeys(corpus) {
  if (!corpus.includes("dataHooks.preview.")) return [];

  const refPreview = readJSON(
    path.join(LOCALES_DIR, REF_LOCALE, `${DEFAULT_NAMESPACE}.json`),
  ).dataHooks?.preview;

  if (!refPreview || typeof refPreview !== "object") return [];

  const keys = [];

  if (corpus.includes("dataHooks.preview.operators.${")) {
    for (const key of Object.keys(refPreview.operators ?? {})) {
      keys.push(`${DEFAULT_NAMESPACE}:dataHooks.preview.operators.${key}`);
    }
  }

  if (corpus.includes("dataHooks.preview.tabs.${")) {
    for (const key of Object.keys(refPreview.tabs ?? {})) {
      keys.push(`${DEFAULT_NAMESPACE}:dataHooks.preview.tabs.${key}`);
    }
  }

  if (corpus.includes("dataHooks.preview.frequencyTable.labels.${")) {
    for (const key of Object.keys(refPreview.frequencyTable?.labels ?? {})) {
      keys.push(
        `${DEFAULT_NAMESPACE}:dataHooks.preview.frequencyTable.labels.${key}`,
      );
    }
  }

  if (corpus.includes("dataHooks.preview.frequencyTable.schedules.${")) {
    for (const key of Object.keys(refPreview.frequencyTable?.schedules ?? {})) {
      keys.push(
        `${DEFAULT_NAMESPACE}:dataHooks.preview.frequencyTable.schedules.${key}`,
      );
    }
  }

  if (corpus.includes("dataHooks.preview.trigger.crud.${")) {
    const crud = refPreview.trigger?.crud;
    if (crud && typeof crud === "object") {
      for (const [operation, phases] of Object.entries(crud)) {
        if (!phases || typeof phases !== "object") continue;
        for (const phase of Object.keys(phases)) {
          keys.push(
            `${DEFAULT_NAMESPACE}:dataHooks.preview.trigger.crud.${operation}.${phase}`,
          );
        }
      }
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

/** entity.viewSettings.gridTemplateColumnsErrors.${errorCode} in grid editor labels */
function extractGridTemplateColumnsErrorKeys(corpus) {
  if (
    !corpus.includes("entity.viewSettings.gridTemplateColumnsErrors.${") &&
    !corpus.includes("`entity.viewSettings.gridTemplateColumnsErrors.${")
  ) {
    return [];
  }

  const refEntity = readJSON(
    path.join(LOCALES_DIR, REF_LOCALE, `${DEFAULT_NAMESPACE}.json`),
  ).entity;

  const errors = refEntity?.viewSettings?.gridTemplateColumnsErrors;
  if (!errors || typeof errors !== "object") return [];

  return Object.keys(errors).map(
    (key) =>
      `${DEFAULT_NAMESPACE}:entity.viewSettings.gridTemplateColumnsErrors.${key}`,
  );
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

/** metrics.preview.aggregated.aggregation.${operation} and metrics.preview.computed.computation.${type} */
function extractMetricPreviewDynamicKeys(corpus) {
  const needsAggregation = corpus.includes(
    "metrics.preview.aggregated.aggregation.${",
  );
  const needsComputation = corpus.includes(
    "metrics.preview.computed.computation.${",
  );
  if (!needsAggregation && !needsComputation) return [];

  const refPreview = readJSON(
    path.join(LOCALES_DIR, REF_LOCALE, `${DEFAULT_NAMESPACE}.json`),
  ).metrics?.preview;

  if (!refPreview || typeof refPreview !== "object") return [];

  const keys = [];

  if (needsAggregation) {
    const aggregation = refPreview.aggregated?.aggregation;
    if (aggregation && typeof aggregation === "object") {
      for (const key of Object.keys(aggregation)) {
        keys.push(
          `${DEFAULT_NAMESPACE}:metrics.preview.aggregated.aggregation.${key}`,
        );
      }
    }
  }

  if (needsComputation) {
    const computation = refPreview.computed?.computation;
    if (computation && typeof computation === "object") {
      for (const key of Object.keys(computation)) {
        keys.push(
          `${DEFAULT_NAMESPACE}:metrics.preview.computed.computation.${key}`,
        );
      }
    }
  }

  return keys;
}

/** queryBuilder.howItWorks.aggregated.aggregation.${operation} in query preview UI */
function extractQueryBuilderPreviewDynamicKeys(corpus) {
  if (!corpus.includes("queryBuilder.howItWorks.aggregated.aggregation.${")) {
    return [];
  }

  const aggregation = readJSON(
    path.join(LOCALES_DIR, REF_LOCALE, `${DEFAULT_NAMESPACE}.json`),
  ).queryBuilder?.howItWorks?.aggregated?.aggregation;

  if (!aggregation || typeof aggregation !== "object") return [];

  return Object.keys(aggregation).map(
    (key) =>
      `${DEFAULT_NAMESPACE}:queryBuilder.howItWorks.aggregated.aggregation.${key}`,
  );
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

/** debuggerSourceLabelKey() → all keys under debugger.sources */
function extractDebuggerSourceKeys(corpus) {
  if (
    !corpus.includes("debuggerSourceLabelKey") &&
    !corpus.includes("debugger.sources.")
  ) {
    return [];
  }

  const refDebugger = readJSON(
    path.join(LOCALES_DIR, REF_LOCALE, `${DEFAULT_NAMESPACE}.json`),
  ).debugger;

  const sources = refDebugger?.sources;
  if (!sources || typeof sources !== "object") return [];

  return Object.keys(sources).map(
    (key) => `${DEFAULT_NAMESPACE}:debugger.sources.${key}`,
  );
}

/** hookExecutionLiveMetricLabelKey() → live hook execution KPI labels */
function extractHookExecutionLiveMetricLabelKeys(corpus) {
  if (!corpus.includes("hookExecutionLiveMetricLabelKey")) {
    return [];
  }

  const refDebugger = readJSON(
    path.join(LOCALES_DIR, REF_LOCALE, `${DEFAULT_NAMESPACE}.json`),
  ).debugger;

  const summary = refDebugger?.summary;
  if (!summary || typeof summary !== "object") return [];

  const liveKeys = [
    "inlineRunning",
    "deferredRunning",
    "queuedPending",
    "cloudRunning",
  ];

  return liveKeys
    .filter((key) => key in summary)
    .map((key) => `${DEFAULT_NAMESPACE}:debugger.summary.${key}`);
}

/** hookExecutionTypeLabelKey() → debugger.executionType.* */
function extractHookExecutionTypeLabelKeys(corpus) {
  if (!corpus.includes("hookExecutionTypeLabelKey")) {
    return [];
  }

  const refDebugger = readJSON(
    path.join(LOCALES_DIR, REF_LOCALE, `${DEFAULT_NAMESPACE}.json`),
  ).debugger;

  const executionType = refDebugger?.executionType;
  if (!executionType || typeof executionType !== "object") return [];

  return Object.keys(executionType).map(
    (key) => `${DEFAULT_NAMESPACE}:debugger.executionType.${key}`,
  );
}

/** debuggerStatusLabelKey() → all keys under debugger.status */
function extractDebuggerStatusLabelKeys(corpus) {
  if (
    !corpus.includes("debuggerStatusLabelKey") &&
    !corpus.includes("debugger.status.")
  ) {
    return [];
  }

  const refDebugger = readJSON(
    path.join(LOCALES_DIR, REF_LOCALE, `${DEFAULT_NAMESPACE}.json`),
  ).debugger;

  const status = refDebugger?.status;
  if (!status || typeof status !== "object") return [];

  return Object.keys(status).map(
    (key) => `${DEFAULT_NAMESPACE}:debugger.status.${key}`,
  );
}

/** DESIGN_LAYOUT_FEATURE_LABEL_KEY in design-layout-nav.ts → common:nav.* */
function extractDesignLayoutNavLabelKeys(files) {
  const file = files.find((f) => f.path.endsWith("design-layout-nav.ts"));
  if (!file) return [];

  const blockMatch = file.content.match(
    /DESIGN_LAYOUT_FEATURE_LABEL_KEY[^=]*=\s*\{([\s\S]*?)\n\};/,
  );
  if (!blockMatch) return [];

  const keys = new Set();
  for (const match of blockMatch[1].matchAll(/:\s*"([^"]+)"/g)) {
    keys.add(`${DEFAULT_NAMESPACE}:nav.${match[1]}`);
  }
  return [...keys];
}

/** DEBUGGER_SOURCE_NAV_LABEL_KEYS in debugger-nav.ts → common:nav.* */
function extractDebuggerNavLabelKeys(files) {
  const file = files.find((f) => f.path.endsWith("debugger-nav.ts"));
  if (!file) return [];

  const blockMatch = file.content.match(
    /DEBUGGER_SOURCE_NAV_LABEL_KEYS[^=]*=\s*\{([\s\S]*?)\n\};/,
  );
  if (!blockMatch) return [];

  const keys = new Set();
  for (const match of blockMatch[1].matchAll(/:\s*"([^"]+)"/g)) {
    keys.add(`${DEFAULT_NAMESPACE}:nav.${match[1]}`);
  }
  return [...keys];
}

/** indexProvisioning.environmentBlocked.${feature}.* in IndexEnvironmentBlockedNotice */
function extractIndexProvisioningEnvironmentBlockedKeys(corpus) {
  if (!corpus.includes("indexProvisioning.environmentBlocked.${")) return [];

  const refEnvironmentBlocked = readJSON(
    path.join(LOCALES_DIR, REF_LOCALE, `${DEFAULT_NAMESPACE}.json`),
  ).indexProvisioning?.environmentBlocked;

  if (!refEnvironmentBlocked || typeof refEnvironmentBlocked !== "object") {
    return [];
  }

  const keys = [];
  for (const [feature, bucket] of Object.entries(refEnvironmentBlocked)) {
    if (feature === "retryHint" || feature === "debuggerLink") continue;
    if (!bucket || typeof bucket !== "object") continue;
    for (const suffix of Object.keys(bucket)) {
      keys.push(
        `${DEFAULT_NAMESPACE}:indexProvisioning.environmentBlocked.${feature}.${suffix}`,
      );
    }
  }
  return keys;
}

/** indexProvisioning.processList.filters.${option} in IndexProvisioningProcessList */
function extractIndexProvisioningProcessListFilterKeys(corpus) {
  if (!corpus.includes("indexProvisioning.processList.filters.${")) return [];

  const refFilters = readJSON(
    path.join(LOCALES_DIR, REF_LOCALE, `${DEFAULT_NAMESPACE}.json`),
  ).indexProvisioning?.processList?.filters;

  if (!refFilters || typeof refFilters !== "object") {
    return [];
  }

  return Object.keys(refFilters).map(
    (option) =>
      `${DEFAULT_NAMESPACE}:indexProvisioning.processList.filters.${option}`,
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
  "components/metrics/MetricAggregatedDefinitionForm.tsx",
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
mergeUsedKeys(
  usedKeys,
  extractQueryBuilderPreviewDynamicKeys(corpus),
  path.join(
    SRC_DIR,
    "features/entity-query-builder/preview/build-entity-query-preview-model.ts",
  ),
);
mergeUsedKeys(
  usedKeys,
  extractMetricPreviewDynamicKeys(corpus),
  path.join(
    SRC_DIR,
    "features/metrics-builder/preview/build-metric-preview-model.ts",
  ),
);
const formDesignerLayoutEditorLabelsFile = path.join(
  SRC_DIR,
  "features/form-designer/form-designer-layout-editor-labels.ts",
);
mergeUsedKeys(
  usedKeys,
  extractGridTemplateColumnsErrorKeys(corpus),
  formDesignerLayoutEditorLabelsFile,
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
const aiJobDetailFile = path.join(
  SRC_DIR,
  "features/debugger/sources/ai-job-detail.tsx",
);
mergeUsedKeys(usedKeys, extractAiDebuggerTabKeys(corpus), aiJobDetailFile);
mergeUsedKeys(
  usedKeys,
  extractDebuggerSourceKeys(corpus),
  path.join(SRC_DIR, "features/debugger/debugger-source-config.ts"),
);
mergeUsedKeys(
  usedKeys,
  extractDebuggerStatusLabelKeys(corpus),
  path.join(SRC_DIR, "features/debugger/components/DebuggerStatusBadge.tsx"),
);
mergeUsedKeys(
  usedKeys,
  extractHookExecutionLiveMetricLabelKeys(corpus),
  path.join(SRC_DIR, "features/debugger/hook-execution-live-metrics.ts"),
);
mergeUsedKeys(
  usedKeys,
  extractHookExecutionTypeLabelKeys(corpus),
  path.join(SRC_DIR, "features/debugger/hook-execution-live-metrics.ts"),
);
mergeUsedKeys(
  usedKeys,
  extractDesignLayoutNavLabelKeys(files),
  path.join(SRC_DIR, "routing/design-layout-nav.ts"),
);
mergeUsedKeys(
  usedKeys,
  extractDebuggerNavLabelKeys(files),
  path.join(SRC_DIR, "routing/debugger-nav.ts"),
);
mergeUsedKeys(
  usedKeys,
  extractIndexProvisioningEnvironmentBlockedKeys(corpus),
  path.join(
    SRC_DIR,
    "components/index-provisioning/IndexEnvironmentBlockedNotice.tsx",
  ),
);
mergeUsedKeys(
  usedKeys,
  extractIndexProvisioningProcessListFilterKeys(corpus),
  path.join(
    SRC_DIR,
    "features/debugger/components/IndexProvisioningTreePanel.tsx",
  ),
);

mergeUsedKeys(
  usedKeys,
  extractDataHookPreviewDynamicKeys(corpus),
  path.join(SRC_DIR, "features/data-hooks/preview/DataHookPreviewPanel.tsx"),
);

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
