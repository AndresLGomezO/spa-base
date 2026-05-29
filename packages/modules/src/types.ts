import type {
  DefinedEntity,
  EntityUIConfig,
  FieldDefinitions,
  FieldUIConfig,
  ViewConfig,
} from "@repo/entities";

export interface EntityConverter {
  read(raw: unknown): { readonly id: string; readonly tenantId: string };
  write(domain: unknown): unknown;
}

export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

export interface ModuleRouteContext {
  readonly userId: string;
  readonly tenantId: string;
  readonly permissions: readonly string[];
  readonly isSuperAdmin: boolean;
}

export interface ModuleRouteDefinition {
  readonly method: HttpMethod;
  readonly path: string;
  readonly permission?: string;
  readonly handler: (
    request: { readonly query: Record<string, string | undefined> },
    context: ModuleRouteContext,
  ) => Promise<unknown>;
}

export interface HookContext {
  readonly userId: string;
  readonly tenantId: string;
  readonly entityName: string;
  readonly record: Record<string, unknown>;
  readonly services: {
    readonly logger?: {
      info: (message: string, meta?: Record<string, unknown>) => void;
      error: (message: string, meta?: Record<string, unknown>) => void;
    };
  };
}

export type HookHandler = (context: HookContext) => Promise<void> | void;

export interface HookDefinition {
  readonly event: string;
  readonly handler: HookHandler;
  readonly order?: number;
}

export interface EntityUIExtension {
  readonly views?: readonly ViewConfig[];
  readonly fields?: Readonly<Record<string, FieldUIConfig>>;
  readonly nav?: Partial<EntityUIConfig["nav"]>;
}

export interface ModuleUIConfig {
  readonly components?: Readonly<Record<string, string>>;
  readonly extend?: Readonly<Record<string, EntityUIExtension>>;
}

type AnyDefinedEntity = DefinedEntity<string, FieldDefinitions>;

export interface ModuleDefinition {
  readonly name: string;
  readonly version: string;
  readonly dependencies?: readonly string[];
  readonly entities?: readonly AnyDefinedEntity[];
  readonly converters?: Readonly<Record<string, EntityConverter>>;
  readonly routes?: readonly ModuleRouteDefinition[];
  readonly hooks?: readonly HookDefinition[];
  readonly ui?: ModuleUIConfig;
}

export interface AppDefinition {
  readonly modules: readonly ModuleDefinition[];
  readonly entities?: readonly AnyDefinedEntity[];
}

export interface RegisteredRoute extends ModuleRouteDefinition {
  readonly moduleName: string;
}

export interface RegisteredHook {
  readonly moduleName: string;
  readonly event: string;
  readonly handler: HookHandler;
  readonly order: number;
}
