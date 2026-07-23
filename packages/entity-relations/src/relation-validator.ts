import {
  getForeignKeyRelationFields,
  getJoinCollectionRelations,
  getRelationOnDelete,
  resolveJoinCollectionName,
  type DefinedEntity,
  type FieldDefinitions,
} from "@repo/entities";

import { RelationError, RelationErrorCode } from "./errors.js";
import type { RelationServicesDeps } from "./types.js";

type AnyDefinedEntity = DefinedEntity<string, FieldDefinitions>;

function isMissingRelationValue(value: unknown): boolean {
  return value === undefined || value === null || value === "";
}

function canUserReadRecord(
  record: Record<string, unknown>,
  userId: string,
): boolean {
  if (record.ownerId === userId) return true;
  const sharedWith = record.sharedWith as
    | Readonly<Record<string, string>>
    | undefined;
  if (sharedWith && typeof sharedWith === "object" && sharedWith[userId]) {
    return true;
  }
  return false;
}

export function createRelationValidator(deps: RelationServicesDeps) {
  return {
    async validateWrite(
      entity: AnyDefinedEntity,
      record: Record<string, unknown>,
      mode: "create" | "update",
      userId?: string,
    ): Promise<void> {
      for (const { fieldName, relation } of getForeignKeyRelationFields(
        entity.metadata,
      )) {
        const value = record[fieldName];
        const isRequired =
          relation.required === true ||
          entity.metadata.fields[fieldName]?.required === true;

        if (isMissingRelationValue(value)) {
          if (mode === "create" && isRequired) {
            throw new RelationError(
              RelationErrorCode.RELATION_REQUIRED,
              `Relation field "${fieldName}" is required.`,
            );
          }
          continue;
        }

        if (typeof value !== "string") {
          throw new RelationError(
            RelationErrorCode.RELATION_NOT_FOUND,
            `Relation field "${fieldName}" must be a string id.`,
          );
        }

        const targetEntity = deps.getEntityDefinition(relation.target);
        if (!targetEntity) {
          throw new RelationError(
            RelationErrorCode.RELATION_NOT_FOUND,
            `Unknown relation target "${relation.target}".`,
          );
        }

        const tenantId =
          typeof record.tenantId === "string" ? record.tenantId : null;
        if (!tenantId) {
          throw new RelationError(
            RelationErrorCode.RELATION_REQUIRED,
            "Tenant context is required for relation validation.",
          );
        }

        const referenced = await deps.findById(
          relation.target,
          value,
          tenantId,
        );
        if (!referenced) {
          throw new RelationError(
            RelationErrorCode.RELATION_NOT_FOUND,
            `Referenced ${relation.target} "${value}" was not found in this tenant.`,
          );
        }

        if (userId && !targetEntity.metadata.tenantWideRead) {
          if (!canUserReadRecord(referenced, userId)) {
            throw new RelationError(
              RelationErrorCode.REFERENCE_ACCESS_DENIED,
              `You do not have access to the referenced ${relation.target} record "${value}".`,
            );
          }
        }
      }
    },
  };
}

export function createRelationDeleteHandler(deps: RelationServicesDeps) {
  return {
    async beforeDelete(
      entity: AnyDefinedEntity,
      id: string,
      tenantId: string,
      userId?: string,
    ): Promise<void> {
      for (const referencingEntity of deps.getAllEntityDefinitions()) {
        for (const { fieldName, relation } of getForeignKeyRelationFields(
          referencingEntity.metadata,
        )) {
          if (relation.target !== entity.name) {
            continue;
          }

          const references = await deps.findByField(
            referencingEntity.name,
            fieldName,
            id,
            tenantId,
          );

          if (references.length === 0) {
            continue;
          }

          const onDelete = getRelationOnDelete(relation);

          const ownedRefs = userId
            ? references.filter((ref) => ref.ownerId === userId)
            : references;

          if (onDelete === "restrict") {
            if (ownedRefs.length > 0) {
              throw new RelationError(
                RelationErrorCode.RELATION_DELETE_RESTRICTED,
                `Cannot delete ${entity.name} "${id}" because ${referencingEntity.name} records reference it.`,
              );
            }
            continue;
          }

          for (const reference of ownedRefs) {
            if (onDelete === "nullify") {
              const before = { ...(reference as Record<string, unknown>) };
              await deps.update(
                referencingEntity.name,
                reference.id,
                tenantId,
                { [fieldName]: undefined },
              );
              const after = { ...before, [fieldName]: undefined };
              await deps.onChildRecordMutated?.({
                tenantId,
                entityName: referencingEntity.name,
                operation: "UPDATE",
                documentId: reference.id,
                before,
                after,
                businessFieldNames: Object.keys(referencingEntity.metadata.fields),
              });
              continue;
            }

            if (onDelete === "cascade") {
              const before = { ...(reference as Record<string, unknown>) };
              await deps.delete(referencingEntity.name, reference.id, tenantId);
              await deps.onChildRecordMutated?.({
                tenantId,
                entityName: referencingEntity.name,
                operation: "DELETE",
                documentId: reference.id,
                before,
                after: null,
                businessFieldNames: Object.keys(referencingEntity.metadata.fields),
              });
            }
          }
        }
      }

      if (!deps.joinRepository) {
        return;
      }

      for (const { relation } of getJoinCollectionRelations(entity.metadata)) {
        const joinCollection = resolveJoinCollectionName(
          entity.name,
          relation.target,
          relation,
        );
        await deps.joinRepository.deleteByEntityId(
          tenantId,
          joinCollection,
          entity.name,
          id,
        );
      }

      for (const referencingEntity of deps.getAllEntityDefinitions()) {
        for (const { relation } of getJoinCollectionRelations(
          referencingEntity.metadata,
        )) {
          if (relation.target !== entity.name) {
            continue;
          }

          const joinCollection = resolveJoinCollectionName(
            referencingEntity.name,
            relation.target,
            relation,
          );
          await deps.joinRepository.deleteByEntityId(
            tenantId,
            joinCollection,
            entity.name,
            id,
          );
        }
      }
    },
  };
}
