import type { z } from "zod";

import type { EntityFileReference } from "./schema/entityFileReference.js";
import type { EntityUIConfig } from "./ui/types.js";

import type { SystemFieldKey, SystemFieldRecord } from "./systemFields.js";

export type {
  EntityFileReference,
  EntityFileReferenceWithDownload,
} from "./schema/entityFileReference.js";

export type Phase1FieldType =
  | "string"
  | "number"
  | "boolean"
  | "date"
  | "relation"
  | "enum"
  | "image"
  | "document";

export type RelationType =
  | "one-to-one"
  | "one-to-many"
  | "many-to-one"
  | "many-to-many";

export type RelationOnDelete = "restrict" | "cascade" | "nullify";

export interface RelationConfig {
  readonly target: string;
  readonly type: RelationType;
  readonly inverse?: string;
  readonly required?: boolean;
  readonly onDelete?: RelationOnDelete;
  readonly joinCollection?: string;
}

export interface StringFieldConfig {
  readonly type: "string";
  readonly required?: boolean;
  readonly default?: string;
  readonly sensitive?: boolean;
  readonly isArray?: boolean;
}

export type NumberKind = "integer" | "decimal";

export interface NumberFieldConfig {
  readonly type: "number";
  readonly required?: boolean;
  readonly default?: number;
  readonly sensitive?: boolean;
  readonly numberKind?: NumberKind;
  readonly isArray?: boolean;
}

export interface BooleanFieldConfig {
  readonly type: "boolean";
  readonly required?: boolean;
  readonly default?: boolean;
  readonly sensitive?: boolean;
  readonly isArray?: boolean;
}

export interface DateFieldConfig {
  readonly type: "date";
  readonly required?: boolean;
  readonly default?: string;
  readonly sensitive?: boolean;
  readonly isArray?: boolean;
}

export interface RelationFieldConfig {
  readonly type: "relation";
  readonly required?: boolean;
  readonly relation: RelationConfig;
}

export interface EnumFieldConfig {
  readonly type: "enum";
  readonly required?: boolean;
  readonly default?: string;
  readonly enumValues: readonly string[];
  readonly sensitive?: boolean;
  readonly isArray?: boolean;
}

export interface ImageFieldConfig {
  readonly type: "image";
  readonly required?: boolean;
  readonly maxSizeBytes?: number;
  readonly defaultImage?: EntityFileReference;
}

export interface DocumentFieldConfig {
  readonly type: "document";
  readonly required?: boolean;
  readonly maxSizeBytes?: number;
}

export type FieldConfig =
  | StringFieldConfig
  | NumberFieldConfig
  | BooleanFieldConfig
  | DateFieldConfig
  | RelationFieldConfig
  | EnumFieldConfig
  | ImageFieldConfig
  | DocumentFieldConfig;

export type FieldDefinitions = Readonly<Record<string, FieldConfig>>;

type InferScalarFieldValue<F extends FieldConfig> = F["type"] extends "string"
  ? string
  : F["type"] extends "number"
    ? number
    : F["type"] extends "boolean"
      ? boolean
      : F["type"] extends "date"
        ? string
        : F["type"] extends "relation"
          ? string
          : F["type"] extends "enum"
            ? string
            : F["type"] extends "image" | "document"
              ? EntityFileReference
              : never;

export type InferFieldValue<F extends FieldConfig> = F extends {
  readonly isArray: true;
}
  ? InferScalarFieldValue<F>[]
  : InferScalarFieldValue<F>;

type IsRequiredInEntity<F extends FieldConfig> = F extends { required: true }
  ? true
  : false;

type InferUserFields<TFields extends FieldDefinitions> = {
  readonly [K in keyof TFields as IsRequiredInEntity<TFields[K]> extends true
    ? K
    : never]: InferFieldValue<TFields[K]>;
} & {
  readonly [K in keyof TFields as IsRequiredInEntity<TFields[K]> extends false
    ? K
    : never]?: InferFieldValue<TFields[K]>;
};

export type InferEntity<TFields extends FieldDefinitions> =
  InferUserFields<TFields> & SystemFieldRecord;

type IsRequiredOnCreate<F extends FieldConfig> = F extends { required: true }
  ? F extends { default: unknown }
    ? false
    : true
  : false;

type InferCreateFields<TFields extends FieldDefinitions> = {
  readonly [K in keyof TFields as IsRequiredOnCreate<TFields[K]> extends true
    ? K
    : never]: InferFieldValue<TFields[K]>;
} & {
  readonly [K in keyof TFields as IsRequiredOnCreate<TFields[K]> extends false
    ? K
    : never]?: InferFieldValue<TFields[K]>;
};

export type InferCreate<TFields extends FieldDefinitions> =
  InferCreateFields<TFields>;

export type InferUpdate<TFields extends FieldDefinitions> = Partial<
  InferUserFields<TFields>
>;

export interface NormalizedFieldMeta {
  readonly type: Phase1FieldType;
  readonly required: boolean;
  readonly optional: boolean;
  readonly default?: string | number | boolean;
  readonly relation?: RelationConfig;
  readonly enumValues?: readonly string[];
  readonly sensitive?: boolean;
  readonly numberKind?: NumberKind;
  readonly maxSizeBytes?: number;
  readonly defaultImage?: EntityFileReference;
  readonly isArray?: boolean;
}

export interface EntityMetadata<
  TName extends string = string,
  TFields extends FieldDefinitions = FieldDefinitions,
> {
  readonly name: TName;
  readonly collection: string;
  readonly fields: Readonly<
    Record<keyof TFields & string, NormalizedFieldMeta>
  >;
  readonly systemFields: typeof import("./systemFields.js").SYSTEM_FIELDS;
  readonly schema: z.ZodType<InferEntity<TFields>>;
  readonly createSchema: z.ZodType<InferCreate<TFields>>;
  readonly updateSchema: z.ZodType<InferUpdate<TFields>>;
  readonly permissions: EntityPermissions<TName>;
  readonly ui?: EntityUIConfig;
  readonly tenantWideRead?: boolean;
  readonly inMemoryListQueries?: boolean;
  readonly hiddenFromNav?: boolean;
  readonly navCategoryId?: string;
  readonly navOrder?: number;
  readonly displayField?: string;
  readonly description?: string;
}

export type EntityPermissionAction =
  | "read"
  | "create"
  | "update"
  | "delete"
  | "share"
  | "manage_shares";

export type EntityPermission<TName extends string> =
  `${TName}.${EntityPermissionAction}`;

export type EntityPermissions<TName extends string> =
  readonly EntityPermission<TName>[];

type AssertNoSystemFields<TFields extends FieldDefinitions> = SystemFieldKey &
  keyof TFields extends never
  ? TFields
  : never;

export type { AssertNoSystemFields };

export type EntityConfig<
  TName extends string,
  TFields extends FieldDefinitions,
> = {
  readonly name: TName;
  readonly fields: AssertNoSystemFields<TFields>;
  readonly collection?: string;
  readonly ui?: EntityUIConfig;
  readonly tenantWideRead?: boolean;
  readonly inMemoryListQueries?: boolean;
  readonly hiddenFromNav?: boolean;
  readonly navCategoryId?: string;
  readonly navOrder?: number;
  readonly displayField?: string;
  readonly description?: string;
};

export interface DefinedEntity<
  TName extends string,
  TFields extends FieldDefinitions,
> {
  readonly name: TName;
  readonly metadata: EntityMetadata<TName, TFields>;
  readonly schema: z.ZodType<InferEntity<TFields>>;
  readonly createSchema: z.ZodType<InferCreate<TFields>>;
  readonly updateSchema: z.ZodType<InferUpdate<TFields>>;
}
