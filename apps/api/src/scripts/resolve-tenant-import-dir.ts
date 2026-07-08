import { existsSync } from "node:fs";
import { join } from "node:path";

export function resolveRepoRoot(startDir: string = process.cwd()): string {
  if (existsSync(join(startDir, "pnpm-workspace.yaml"))) {
    return startDir;
  }

  const parent = join(startDir, "..");
  if (existsSync(join(parent, "pnpm-workspace.yaml"))) {
    return parent;
  }

  return startDir;
}

export function resolveTenantImportDir(
  startDir: string = process.cwd(),
): string {
  const fromEnv = process.env.TENANT_IMPORT_DIR?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  return join(resolveRepoRoot(startDir), ".local/tenant-import");
}
