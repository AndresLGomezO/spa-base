/**
 * Scans monorepo workspaces for duplicate exports, similar file names,
 * signature overlaps, and copy-pasted function bodies.
 *
 * Usage:
 *   pnpm exec tsx scripts/find-duplicates.ts
 *   pnpm exec tsx scripts/find-duplicates.ts --json
 */

import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import {
  Node,
  Project,
  SyntaxKind,
  type ParameterDeclaration,
  type SourceFile,
} from "ts-morph";

interface WorkspaceTarget {
  name: string;
  tsconfig: string;
  srcRoot: string;
}

const WORKSPACES: WorkspaceTarget[] = [
  {
    name: "api",
    tsconfig: path.resolve("apps/api/tsconfig.json"),
    srcRoot: path.resolve("apps/api/src"),
  },
  {
    name: "web",
    tsconfig: path.resolve("apps/web/tsconfig.json"),
    srcRoot: path.resolve("apps/web/app"),
  },
];

const IGNORE_SYMBOLS = new Set<string>([]);

const IGNORE_PARAM_PATTERNS: string[] = [];

const IGNORE_EXACT_SIGNATURES = new Set<string>([
  "",
  "string",
  "number",
  "boolean",
  "string, string",
  "any",
  "unknown",
]);

const IGNORE_BASE_NAMES = new Set<string>([
  "index",
  "types",
  "utils",
  "helpers",
  "constants",
  "config",
  "schema",
  "schemas",
  "middleware",
  "errors",
  "env",
  "logger",
  "main",
  "app",
  "root",
  "home",
  "home-page",
  "routes",
  "roles",
]);

const MIN_BODY_LENGTH = 40;
const JSON_OUTPUT = process.argv.includes("--json");

interface SymbolLocation {
  file: string;
  kind: string;
  line: number;
  workspace: string;
}

interface DuplicateSymbol {
  name: string;
  locations: SymbolLocation[];
}

interface SimilarFileGroup {
  baseName: string;
  files: { path: string; workspace: string }[];
}

interface FnSignature {
  name: string;
  file: string;
  line: number;
  paramCount: number;
  paramSignature: string;
  workspace: string;
}

interface SignatureOverlap {
  functions: FnSignature[];
}

interface BodyDuplicate {
  hash: string;
  functions: {
    name: string;
    file: string;
    line: number;
    workspace: string;
  }[];
}

interface Report {
  generated: string;
  workspacesScanned: string[];
  workspacesSkipped: string[];
  duplicateSymbols: DuplicateSymbol[];
  similarFiles: SimilarFileGroup[];
  signatureOverlaps: SignatureOverlap[];
  bodyDuplicates: BodyDuplicate[];
  totals: {
    filesScanned: number;
    duplicateSymbols: number;
    similarFileGroups: number;
    signatureOverlaps: number;
    bodyDuplicates: number;
  };
}

function normalizeSignature(sig: string): string {
  return sig
    .replace(/import\([^)]+\)\./g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function safeParamType(p: ParameterDeclaration): string {
  try {
    return normalizeSignature(p.getType().getText(p));
  } catch {
    return "unknown";
  }
}

function hashBody(text: string): string {
  const normalized = text
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, "")
    .replace(/['"`]/g, "")
    .replace(/;/g, "");
  return crypto.createHash("sha256").update(normalized).digest("hex").slice(0, 16);
}

function shouldInclude(filePath: string, absSrcRoot: string): boolean {
  return (
    filePath.startsWith(absSrcRoot) &&
    !filePath.includes("node_modules") &&
    !filePath.endsWith(".test.ts") &&
    !filePath.endsWith(".test.tsx") &&
    !filePath.endsWith(".spec.ts") &&
    !filePath.endsWith(".spec.tsx") &&
    !filePath.endsWith(".d.ts") &&
    !filePath.includes("__tests__") &&
    !filePath.includes("__mocks__")
  );
}

const exportMap = new Map<string, SymbolLocation[]>();
const allFileNames: { path: string; workspace: string }[] = [];
const allSignatures: FnSignature[] = [];
const bodyHashes = new Map<
  string,
  { name: string; file: string; line: number; workspace: string }[]
>();

const scannedWorkspaces: string[] = [];
const skippedWorkspaces: string[] = [];
let totalFilesScanned = 0;

function collectFunctionSignature(
  name: string,
  params: ParameterDeclaration[],
  file: string,
  line: number,
  workspace: string,
) {
  allSignatures.push({
    name,
    file,
    line,
    paramCount: params.length,
    paramSignature: params.map(safeParamType).join(", "),
    workspace,
  });
}

function collectBodyHash(
  name: string,
  bodyText: string | undefined,
  file: string,
  line: number,
  workspace: string,
) {
  if (!bodyText || bodyText.length < MIN_BODY_LENGTH) return;
  const hash = hashBody(bodyText);
  if (!bodyHashes.has(hash)) bodyHashes.set(hash, []);
  bodyHashes.get(hash)!.push({ name, file, line, workspace });
}

function collectExports(sf: SourceFile, rel: string, workspace: string) {
  const currentFilePath = sf.getFilePath();

  sf.getExportedDeclarations().forEach((decls, name) => {
    if (name === "default") return;

    const first = decls[0];
    if (!first) return;

    const declFilePath = first.getSourceFile().getFilePath();
    if (declFilePath !== currentFilePath) return;

    if (!exportMap.has(name)) exportMap.set(name, []);
    exportMap.get(name)!.push({
      file: rel,
      kind: first.getKindName(),
      line: first.getStartLineNumber(),
      workspace,
    });
  });
}

function collectFunctions(sf: SourceFile, rel: string, workspace: string) {
  for (const fn of sf.getFunctions()) {
    if (!fn.isExported()) continue;

    const name = fn.getName() || "(anonymous)";
    const params = fn.getParameters();

    collectFunctionSignature(
      name,
      params,
      rel,
      fn.getStartLineNumber(),
      workspace,
    );
    collectBodyHash(
      name,
      fn.getBody()?.getText(),
      rel,
      fn.getStartLineNumber(),
      workspace,
    );
  }

  for (const vs of sf.getVariableStatements()) {
    if (!vs.isExported()) continue;

    for (const decl of vs.getDeclarations()) {
      const init = decl.getInitializer();
      if (!init) continue;

      if (Node.isArrowFunction(init) || Node.isFunctionExpression(init)) {
        const params = init.getParameters();
        const name = decl.getName();

        collectFunctionSignature(
          name,
          params,
          rel,
          decl.getStartLineNumber(),
          workspace,
        );
        collectBodyHash(
          name,
          init.getBody()?.getText(),
          rel,
          decl.getStartLineNumber(),
          workspace,
        );
      }
    }
  }

  for (const cls of sf.getClasses()) {
    if (!cls.isExported()) continue;

    const className = cls.getName() ?? "(anonymous class)";

    for (const method of cls.getMethods()) {
      if (
        method.hasModifier(SyntaxKind.PrivateKeyword) ||
        method.hasModifier(SyntaxKind.ProtectedKeyword)
      ) {
        continue;
      }

      const name = `${className}.${method.getName()}`;
      const params = method.getParameters();

      collectFunctionSignature(
        name,
        params,
        rel,
        method.getStartLineNumber(),
        workspace,
      );
      collectBodyHash(
        name,
        method.getBody()?.getText(),
        rel,
        method.getStartLineNumber(),
        workspace,
      );
    }
  }
}

for (const ws of WORKSPACES) {
  if (!fs.existsSync(ws.tsconfig)) {
    console.error(
      `Skipping "${ws.name}": tsconfig not found at ${ws.tsconfig}`,
    );
    skippedWorkspaces.push(ws.name);
    continue;
  }

  scannedWorkspaces.push(ws.name);

  const project = new Project({
    tsConfigFilePath: ws.tsconfig,
    skipAddingFilesFromTsConfig: false,
  });

  const sourceFiles = project
    .getSourceFiles()
    .filter((sf) => shouldInclude(sf.getFilePath(), ws.srcRoot));

  console.error(`[${ws.name}] Scanning ${sourceFiles.length} files...`);
  totalFilesScanned += sourceFiles.length;

  for (const sf of sourceFiles) {
    const rel = path.relative(process.cwd(), sf.getFilePath());
    allFileNames.push({ path: rel, workspace: ws.name });

    collectExports(sf, rel, ws.name);
    collectFunctions(sf, rel, ws.name);
  }
}

const duplicateSymbols: DuplicateSymbol[] = [];

for (const [name, locations] of exportMap) {
  if (locations.length <= 1) continue;
  if (IGNORE_SYMBOLS.has(name)) continue;

  const workspaces = new Set(locations.map((l) => l.workspace));
  if (workspaces.size === 1) continue;

  duplicateSymbols.push({ name, locations });
}

duplicateSymbols.sort((a, b) => b.locations.length - a.locations.length);

const baseNameMap = new Map<string, { path: string; workspace: string }[]>();

for (const entry of allFileNames) {
  const base = path
    .basename(entry.path, path.extname(entry.path))
    .replace(/-/g, "")
    .toLowerCase();

  if (!baseNameMap.has(base)) baseNameMap.set(base, []);
  baseNameMap.get(base)!.push(entry);
}

const similarFiles: SimilarFileGroup[] = [];

for (const [baseName, files] of baseNameMap) {
  if (files.length <= 1) continue;
  if (IGNORE_BASE_NAMES.has(baseName)) continue;

  const dirs = new Set(files.map((f) => path.dirname(f.path)));
  if (dirs.size <= 1) continue;

  similarFiles.push({ baseName, files });
}

similarFiles.sort((a, b) => b.files.length - a.files.length);

const sigGroups = new Map<string, FnSignature[]>();

for (const sig of allSignatures) {
  const key = `${sig.paramCount}|${normalizeSignature(sig.paramSignature)}`;
  if (!sigGroups.has(key)) sigGroups.set(key, []);
  sigGroups.get(key)!.push(sig);
}

const signatureOverlaps: SignatureOverlap[] = [];

for (const [, group] of sigGroups) {
  if (group.length <= 1) continue;

  const paramSig = group[0].paramSignature;

  if (IGNORE_EXACT_SIGNATURES.has(paramSig)) continue;
  if (IGNORE_PARAM_PATTERNS.some((p) => paramSig.includes(p))) continue;

  const groupWorkspaces = new Set(group.map((g) => g.workspace));
  if (groupWorkspaces.size === 1) continue;

  const names = group.map((g) =>
    g.name
      .toLowerCase()
      .replace(/[-_.]/g, "")
      .replace(/^[a-z]+\./, ""),
  );

  const hasSimilar = names.some((n, i) =>
    names.some(
      (m, j) =>
        i !== j &&
        n.length > 3 &&
        m.length > 3 &&
        (n.includes(m) || m.includes(n) || n === m),
    ),
  );

  if (hasSimilar) {
    signatureOverlaps.push({ functions: group });
  }
}

signatureOverlaps.sort((a, b) => b.functions.length - a.functions.length);

const bodyDuplicates: BodyDuplicate[] = [];

for (const [hash, entries] of bodyHashes) {
  if (entries.length <= 1) continue;

  const workspaces = new Set(entries.map((e) => e.workspace));
  if (workspaces.size <= 1) continue;

  bodyDuplicates.push({ hash, functions: entries });
}

bodyDuplicates.sort((a, b) => b.functions.length - a.functions.length);

const report: Report = {
  generated: new Date().toISOString(),
  workspacesScanned: scannedWorkspaces,
  workspacesSkipped: skippedWorkspaces,
  duplicateSymbols,
  similarFiles,
  signatureOverlaps,
  bodyDuplicates,
  totals: {
    filesScanned: totalFilesScanned,
    duplicateSymbols: duplicateSymbols.length,
    similarFileGroups: similarFiles.length,
    signatureOverlaps: signatureOverlaps.length,
    bodyDuplicates: bodyDuplicates.length,
  },
};

if (JSON_OUTPUT) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log("\n" + "=".repeat(70));
  console.log("  DUPLICATE & OVERLAP ANALYSIS");
  console.log("=".repeat(70));
  console.log(`  Workspaces scanned: ${scannedWorkspaces.join(", ")}`);
  console.log(`  Total files: ${totalFilesScanned}`);

  if (skippedWorkspaces.length > 0) {
    console.log(`  Skipped (no tsconfig): ${skippedWorkspaces.join(", ")}`);
  }

  console.log("\nDUPLICATE EXPORTED SYMBOLS");
  console.log("-".repeat(50));
  if (duplicateSymbols.length === 0) {
    console.log("  No duplicates found\n");
  } else {
    for (const dup of duplicateSymbols) {
      console.log(
        `\n  "${dup.name}" — exported ${dup.locations.length} times:`,
      );
      for (const loc of dup.locations) {
        console.log(
          `      [${loc.workspace}] ${loc.file}:${loc.line} (${loc.kind})`,
        );
      }
    }
    console.log("");
  }

  console.log("FILES WITH SIMILAR NAMES (different directories)");
  console.log("-".repeat(50));
  if (similarFiles.length === 0) {
    console.log("  No suspicious overlaps\n");
  } else {
    for (const group of similarFiles) {
      console.log(`\n  "${group.baseName}":`);
      for (const f of group.files) {
        console.log(`      [${f.workspace}] ${f.path}`);
      }
    }
    console.log("");
  }

  console.log("FUNCTIONS WITH IDENTICAL SIGNATURES & SIMILAR NAMES");
  console.log("-".repeat(50));
  if (signatureOverlaps.length === 0) {
    console.log("  No suspicious overlaps\n");
  } else {
    for (const overlap of signatureOverlaps) {
      console.log(
        `\n  Possible overlap (${overlap.functions[0].paramCount} params):`,
      );
      for (const fn of overlap.functions) {
        console.log(
          `      [${fn.workspace}] ${fn.name}() → ${fn.file}:${fn.line}`,
        );
      }
      console.log(`      Signature: (${overlap.functions[0].paramSignature})`);
    }
    console.log("");
  }

  console.log("COPY-PASTED FUNCTION BODIES");
  console.log("-".repeat(50));
  if (bodyDuplicates.length === 0) {
    console.log("  No copy-paste detected\n");
  } else {
    for (const dup of bodyDuplicates) {
      console.log(`\n  Identical body (hash: ${dup.hash}):`);
      for (const fn of dup.functions) {
        console.log(
          `      [${fn.workspace}] ${fn.name}() → ${fn.file}:${fn.line}`,
        );
      }
    }
    console.log("");
  }

  console.log("=".repeat(70));
  console.log("  TOTALS");
  console.log("=".repeat(70));
  console.log(`  Files scanned:          ${report.totals.filesScanned}`);
  console.log(`  Duplicate symbols:      ${report.totals.duplicateSymbols}`);
  console.log(`  Similar file groups:    ${report.totals.similarFileGroups}`);
  console.log(`  Signature overlaps:     ${report.totals.signatureOverlaps}`);
  console.log(`  Body duplicates:        ${report.totals.bodyDuplicates}`);
  console.log("");
}

const hasProblems =
  duplicateSymbols.length > 0 ||
  signatureOverlaps.length > 0 ||
  bodyDuplicates.length > 0;

if (hasProblems) {
  console.error("Duplicates or overlaps detected. Review the report above.\n");
  process.exit(1);
}

console.error("No duplicate or overlap issues detected.\n");
process.exit(0);
