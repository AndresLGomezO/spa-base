import type { DefinedEntity, FieldDefinitions } from "@repo/entities";
import type { JoinCollectionRepository } from "@repo/firestore-converters";

type AnyDefinedEntity = DefinedEntity<string, FieldDefinitions>;

export interface EntityRecordRef {
  readonly id: string;
  readonly tenantId: string;
  readonly [key: string]: unknown;
}

export interface RelationServicesDeps {
  readonly getEntityDefinition: (name: string) => AnyDefinedEntity | undefined;
  readonly getAllEntityDefinitions: () => readonly AnyDefinedEntity[];
  readonly findById: (
    entityName: string,
    id: string,
    tenantId: string,
  ) => Promise<EntityRecordRef | null>;
  readonly findByField: (
    entityName: string,
    field: string,
    value: string,
    tenantId: string,
  ) => Promise<readonly EntityRecordRef[]>;
  readonly update: (
    entityName: string,
    id: string,
    tenantId: string,
    data: Record<string, unknown>,
  ) => Promise<EntityRecordRef | null>;
  readonly delete: (
    entityName: string,
    id: string,
    tenantId: string,
  ) => Promise<boolean>;
  readonly joinRepository?: JoinCollectionRepository;
}
