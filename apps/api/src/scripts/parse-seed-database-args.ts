import {
  assertDropAllowedForSelection,
  assertIdsAllowedForSelection,
  assertValidSeedComponents,
  parseCommaSeparatedSet,
  type SeedComponentKey,
  type SeedSelection,
} from "./seed-selection.js";

export interface SeedDatabaseCliOptions extends SeedSelection {
  readonly gcp: boolean;
  readonly projectId?: string;
}

function normalizeArgv(argv: readonly string[]): string[] {
  return argv.filter((arg) => arg !== "--");
}

function readFlagValue(
  argv: readonly string[],
  index: number,
  flag: string,
): string {
  const value = argv[index + 1]?.trim();
  if (!value) {
    throw new Error(`Missing value for ${flag}.`);
  }
  return value;
}

function readFlagValueOrEquals(
  argv: readonly string[],
  index: number,
  flag: string,
): { readonly value: string; readonly consumedNext: boolean } {
  const arg = argv[index]!;
  const equalsPrefix = `${flag}=`;
  if (arg.startsWith(equalsPrefix)) {
    const value = arg.slice(equalsPrefix.length).trim();
    if (!value) {
      throw new Error(`Missing value for ${flag}.`);
    }
    return { value, consumedNext: false };
  }
  return {
    value: readFlagValue(argv, index, flag),
    consumedNext: true,
  };
}

export function parseSeedDatabaseArgs(
  argv: readonly string[],
): SeedDatabaseCliOptions {
  const normalizedArgv = normalizeArgv(argv);
  let gcp = false;
  let projectId: string | undefined;
  let onlyRaw: string | undefined;
  let idsRaw: string | undefined;
  let drop = false;

  for (let index = 0; index < normalizedArgv.length; index += 1) {
    const arg = normalizedArgv[index]!;
    if (arg === "--gcp") {
      gcp = true;
      continue;
    }
    if (arg === "--project" || arg.startsWith("--project=")) {
      const parsed = readFlagValueOrEquals(normalizedArgv, index, "--project");
      projectId = parsed.value;
      if (parsed.consumedNext) {
        index += 1;
      }
      continue;
    }
    if (arg === "--only" || arg.startsWith("--only=")) {
      const parsed = readFlagValueOrEquals(normalizedArgv, index, "--only");
      onlyRaw = parsed.value;
      if (parsed.consumedNext) {
        index += 1;
      }
      continue;
    }
    if (arg === "--ids" || arg.startsWith("--ids=")) {
      const parsed = readFlagValueOrEquals(normalizedArgv, index, "--ids");
      idsRaw = parsed.value;
      if (parsed.consumedNext) {
        index += 1;
      }
      continue;
    }
    if (arg === "--drop") {
      drop = true;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (gcp && !projectId) {
    throw new Error("--project is required when using --gcp.");
  }

  if (idsRaw !== undefined && onlyRaw === undefined) {
    throw new Error("--ids requires --only.");
  }

  let components: ReadonlySet<SeedComponentKey> | null = null;
  let ids: ReadonlySet<string> | null = null;

  if (onlyRaw !== undefined) {
    const parsedComponents = parseCommaSeparatedSet(onlyRaw);
    assertValidSeedComponents(parsedComponents);
    components = parsedComponents;
  }

  if (idsRaw !== undefined) {
    const parsedIds = parseCommaSeparatedSet(idsRaw);
    if (parsedIds.size === 0) {
      throw new Error("Missing value for --ids (expected comma-separated ids).");
    }
    ids = parsedIds;
    if (components) {
      assertIdsAllowedForSelection(components, ids);
    }
  }

  assertDropAllowedForSelection(components, drop);

  return { gcp, projectId, components, ids, drop };
}
