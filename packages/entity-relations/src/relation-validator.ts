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

export function createRelationValidator(deps: RelationServicesDeps) {
  return {
    async validateWrite(
      entity: AnyDefinedEntity,
      record: Record<string, unknown>,
      mode: "create" | "update",
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

        const referenced = await deps.findById(relation.target, value, tenantId);
        if (!referenced) {
          throw new RelationError(
            RelationErrorCode.RELATION_NOT_FOUND,
            `Referenced ${relation.target} "${value}" was not found in this tenant.`,
          );
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
          if (onDelete === "restrict") {
            throw new RelationError(
              RelationErrorCode.RELATION_DELETE_RESTRICTED,
              `Cannot delete ${entity.name} "${id}" because ${referencingEntity.name} records reference it.`,
            );
          }

          for (const reference of references) {
            if (onDelete === "nullify") {
              await deps.update(
                referencingEntity.name,
                reference.id,
                tenantId,
                { [fieldName]: undefined },
              );
              continue;
            }

            if (onDelete === "cascade") {
              await deps.delete(
                referencingEntity.name,
                reference.id,
                tenantId,
              );
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
