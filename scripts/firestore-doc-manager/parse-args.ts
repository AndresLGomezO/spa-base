export type Subcommand = "get" | "set" | "patch" | "delete" | "list";

export interface SharedFlags {
  readonly projectId: string;
  readonly tenant?: string;
  readonly collection?: string;
  readonly path?: string;
  readonly id?: string;
  readonly file?: string;
  readonly out?: string;
  readonly limit: number;
  readonly dryRun: boolean;
  readonly confirm: boolean;
  readonly pretty: boolean;
}

export interface ParsedCli {
  readonly subcommand: Subcommand;
  readonly flags: SharedFlags;
}

const SUBCOMMANDS = new Set<Subcommand>([
  "get",
  "set",
  "patch",
  "delete",
  "list",
]);

function readFlagValue(argv: readonly string[], index: number): string {
  const value = argv[index + 1]?.trim();
  if (!value) {
    throw new Error(`Missing value for ${argv[index]}.`);
  }
  return value;
}

export function parseArgs(argv: readonly string[]): ParsedCli {
  const subcommand = argv[0]?.trim() as Subcommand | undefined;
  if (!subcommand || !SUBCOMMANDS.has(subcommand)) {
    throw new Error(
      `Usage: pnpm firestore:doc <get|set|patch|delete|list> [flags]\n` +
        `Run with a subcommand and --help is not implemented; see scripts/firestore-doc-manager/README.md.`,
    );
  }

  let projectId = process.env.GCP_PROJECT_ID?.trim() ?? "";
  let tenant: string | undefined;
  let collection: string | undefined;
  let path: string | undefined;
  let id: string | undefined;
  let file: string | undefined;
  let out: string | undefined;
  let limit = 50;
  let dryRun = false;
  let confirm = false;
  let pretty = true;

  for (let index = 1; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--project") {
      projectId = readFlagValue(argv, index);
      index += 1;
      continue;
    }
    if (arg === "--tenant") {
      tenant = readFlagValue(argv, index);
      index += 1;
      continue;
    }
    if (arg === "--collection") {
      collection = readFlagValue(argv, index);
      index += 1;
      continue;
    }
    if (arg === "--path") {
      path = readFlagValue(argv, index);
      index += 1;
      continue;
    }
    if (arg === "--id") {
      id = readFlagValue(argv, index);
      index += 1;
      continue;
    }
    if (arg === "--file") {
      file = readFlagValue(argv, index);
      index += 1;
      continue;
    }
    if (arg === "--out") {
      out = readFlagValue(argv, index);
      index += 1;
      continue;
    }
    if (arg === "--limit") {
      const raw = readFlagValue(argv, index);
      const parsed = Number.parseInt(raw, 10);
      if (!Number.isFinite(parsed) || parsed < 1) {
        throw new Error(`--limit must be a positive integer (got "${raw}").`);
      }
      limit = parsed;
      index += 1;
      continue;
    }
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (arg === "--confirm") {
      confirm = true;
      continue;
    }
    if (arg === "--pretty") {
      pretty = true;
      continue;
    }
    if (arg === "--no-pretty") {
      pretty = false;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!projectId) {
    throw new Error(
      "Set --project or GCP_PROJECT_ID (e.g. entitysystem-development).",
    );
  }

  if (path && (tenant || collection)) {
    throw new Error("Use either --path or --tenant/--collection, not both.");
  }

  if (path) {
    // Path mode: doc path may be fully specified in --path.
  } else if (tenant && !collection) {
    throw new Error("--tenant requires --collection.");
  } else if (!tenant && !collection) {
    throw new Error(
      "Provide --path, or --collection (optionally with --tenant).",
    );
  }

  if (subcommand === "list") {
    if (id) {
      throw new Error("--id is not supported for list.");
    }
    if (path) {
      const segments = path.split("/").filter(Boolean);
      if (segments.length % 2 === 0) {
        throw new Error(
          `--path "${path}" points to a document. Use get/set/patch/delete, or omit the document id for list.`,
        );
      }
    }
  } else if (!path && !id) {
    throw new Error(
      `Subcommand "${subcommand}" requires --id (or a document --path).`,
    );
  }

  if ((subcommand === "set" || subcommand === "patch") && !file) {
    throw new Error(`Subcommand "${subcommand}" requires --file.`);
  }

  if (subcommand === "delete" && !confirm && !dryRun) {
    throw new Error('Subcommand "delete" requires --confirm (or --dry-run).');
  }

  return {
    subcommand,
    flags: {
      projectId,
      tenant,
      collection,
      path,
      id,
      file,
      out,
      limit,
      dryRun,
      confirm,
      pretty,
    },
  };
}
