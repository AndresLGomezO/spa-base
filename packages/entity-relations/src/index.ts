import type { DefinedEntity, FieldDefinitions } from "@repo/entities";

import {
  createJoinCollectionHandler,
  type LinkEntitiesParams,
} from "./join-collection-handler.js";
import { RelationError, RelationErrorCode } from "./errors.js";
import {
  createRelationDeleteHandler,
  createRelationValidator,
} from "./relation-validator.js";
import type { EntityRecordRef, RelationServicesDeps } from "./types.js";

type AnyDefinedEntity = DefinedEntity<string, FieldDefinitions>;

export interface EntityRelationHooks {
  readonly validateWrite: (
    record: Record<string, unknown>,
    mode: "create" | "update",
    userId?: string,
  ) => Promise<void>;
  readonly beforeDelete: (
    id: string,
    tenantId: string,
    userId?: string,
  ) => Promise<void>;
}

export function createEntityRelationHooks(
  entity: AnyDefinedEntity,
  deps: RelationServicesDeps,
): EntityRelationHooks {
  const validator = createRelationValidator(deps);
  const deleteHandler = createRelationDeleteHandler(deps);

  return {
    validateWrite(record, mode, userId) {
      return validator.validateWrite(entity, record, mode, userId);
    },
    beforeDelete(id, tenantId, userId) {
      return deleteHandler.beforeDelete(entity, id, tenantId, userId);
    },
  };
}

export function createRelationResolver(deps: RelationServicesDeps) {
  return {
    async resolveForeignKey(
      targetEntityName: string,
      id: string,
      tenantId: string,
    ): Promise<EntityRecordRef | null> {
      return deps.findById(targetEntityName, id, tenantId);
    },
  };
}

export {
  createJoinCollectionHandler,
  createRelationDeleteHandler,
  createRelationValidator,
  RelationError,
  RelationErrorCode,
};
export type { EntityRecordRef, LinkEntitiesParams, RelationServicesDeps };
