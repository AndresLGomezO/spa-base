export type ApiResource = "record" | "definition" | "ui-override";

export type RecordAction = "create" | "update" | "get" | "delete" | "list";
export type DefinitionAction = "list" | "get" | "create" | "patch";
export type UiOverrideAction = "get" | "put";

export type ApiAction = RecordAction | DefinitionAction | UiOverrideAction;

export interface ApiFlags {
  readonly baseUrl: string;
  readonly token?: string;
  readonly appCheck?: string;
  readonly curlFile?: string;
  readonly entity?: string;
  readonly id?: string;
  readonly file?: string;
  readonly relationsFile?: string;
  readonly out?: string;
  readonly limit?: number;
  readonly dryRun: boolean;
  readonly confirm: boolean;
  readonly pretty: boolean;
}

export interface ParsedApiCli {
  readonly resource: ApiResource;
  readonly action: ApiAction;
  readonly flags: ApiFlags;
}

const RECORD_ACTIONS = new Set<RecordAction>([
  "create",
  "update",
  "get",
  "delete",
  "list",
]);
const DEFINITION_ACTIONS = new Set<DefinitionAction>([
  "list",
  "get",
  "create",
  "patch",
]);
const UI_OVERRIDE_ACTIONS = new Set<UiOverrideAction>(["get", "put"]);

function readFlagValue(argv: readonly string[], index: number): string {
  const value = argv[index + 1]?.trim();
  if (!value) {
    throw new Error(`Missing value for ${argv[index]}.`);
  }
  return value;
}

function parseSharedFlags(argv: readonly string[]): ApiFlags {
  let baseUrl = process.env.API_BASE_URL?.trim() || "http://127.0.0.1:3000";
  let token = process.env.API_ID_TOKEN?.trim();
  let appCheck = process.env.API_APP_CHECK_TOKEN?.trim();
  let curlFile: string | undefined;
  let entity: string | undefined;
  let id: string | undefined;
  let file: string | undefined;
  let relationsFile: string | undefined;
  let out: string | undefined;
  let limit: number | undefined;
  let dryRun = false;
  let confirm = false;
  let pretty = true;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--base-url") {
      baseUrl = readFlagValue(argv, index);
      index += 1;
      continue;
    }
    if (arg === "--token") {
      token = readFlagValue(argv, index);
      index += 1;
      continue;
    }
    if (arg === "--app-check") {
      appCheck = readFlagValue(argv, index);
      index += 1;
      continue;
    }
    if (arg === "--curl-file") {
      curlFile = readFlagValue(argv, index);
      index += 1;
      continue;
    }
    if (arg === "--entity") {
      entity = readFlagValue(argv, index);
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
    if (arg === "--relations-file") {
      relationsFile = readFlagValue(argv, index);
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

  return {
    baseUrl,
    token,
    appCheck,
    curlFile,
    entity,
    id,
    file,
    relationsFile,
    out,
    limit,
    dryRun,
    confirm,
    pretty,
  };
}

function validateRecordAction(action: RecordAction, flags: ApiFlags): void {
  if (!flags.entity) {
    throw new Error(`record ${action} requires --entity.`);
  }

  if (action === "create" || action === "update") {
    if (!flags.file) {
      throw new Error(`record ${action} requires --file.`);
    }
  }

  if (action === "update" || action === "get" || action === "delete") {
    if (!flags.id) {
      throw new Error(`record ${action} requires --id.`);
    }
  }

  if (action === "delete" && !flags.confirm && !flags.dryRun) {
    throw new Error('record delete requires --confirm (or --dry-run).');
  }
}

function validateDefinitionAction(
  action: DefinitionAction,
  flags: ApiFlags,
): void {
  if (action === "get" || action === "patch") {
    if (!flags.id) {
      throw new Error(`definition ${action} requires --id.`);
    }
  }

  if ((action === "create" || action === "patch") && !flags.file) {
    throw new Error(`definition ${action} requires --file.`);
  }
}

function validateUiOverrideAction(
  action: UiOverrideAction,
  flags: ApiFlags,
): void {
  if (!flags.entity) {
    throw new Error(`ui-override ${action} requires --entity.`);
  }

  if (action === "put" && !flags.file) {
    throw new Error("ui-override put requires --file.");
  }
}

export function parseApiArgs(argv: readonly string[]): ParsedApiCli {
  const resource = argv[0]?.trim() as ApiResource | undefined;
  const action = argv[1]?.trim() as ApiAction | undefined;

  if (!resource || !action) {
    throw new Error(
      "Usage: pnpm entity:api <record|definition|ui-override> <action> [flags]\n" +
        "See scripts/firestore-doc-manager/README.md.",
    );
  }

  const flags = parseSharedFlags(argv.slice(2));

  if (resource === "record") {
    if (!RECORD_ACTIONS.has(action as RecordAction)) {
      throw new Error(
        `Unknown record action "${action}". Use create, update, get, delete, or list.`,
      );
    }
    validateRecordAction(action as RecordAction, flags);
  } else if (resource === "definition") {
    if (!DEFINITION_ACTIONS.has(action as DefinitionAction)) {
      throw new Error(
        `Unknown definition action "${action}". Use list, get, create, or patch.`,
      );
    }
    validateDefinitionAction(action as DefinitionAction, flags);
  } else if (resource === "ui-override") {
    if (!UI_OVERRIDE_ACTIONS.has(action as UiOverrideAction)) {
      throw new Error(
        `Unknown ui-override action "${action}". Use get or put.`,
      );
    }
    validateUiOverrideAction(action as UiOverrideAction, flags);
  } else {
    throw new Error(
      `Unknown resource "${resource}". Use record, definition, or ui-override.`,
    );
  }

  return { resource, action, flags };
}
