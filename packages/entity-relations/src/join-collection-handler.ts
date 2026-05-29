import {
  resolveJoinCollectionName,
  type DefinedEntity,
  type FieldDefinitions,
} from "@repo/entities";
import type { JoinRecord } from "@repo/firestore-converters";

import { RelationError, RelationErrorCode } from "./errors.js";
import type { RelationServicesDeps } from "./types.js";

type AnyDefinedEntity = DefinedEntity<string, FieldDefinitions>;

export interface LinkEntitiesParams {
  readonly sourceEntity: AnyDefinedEntity;
  readonly sourceId: string;
  readonly targetEntity: AnyDefinedEntity;
  readonly targetId: string;
  readonly tenantId: string;
  readonly joinCollection?: string;
}

export function createJoinCollectionHandler(deps: RelationServicesDeps) {
  if (!deps.joinRepository) {
    throw new Error("JoinCollectionRepository is required.");
  }

  const joinRepository = deps.joinRepository;

  return {
    async link(params: LinkEntitiesParams): Promise<JoinRecord> {
      const source = await deps.findById(
        params.sourceEntity.name,
        params.sourceId,
        params.tenantId,
      );
      if (!source) {
        throw new RelationError(
          RelationErrorCode.RELATION_NOT_FOUND,
          `Source ${params.sourceEntity.name} "${params.sourceId}" was not found.`,
        );
      }

      const target = await deps.findById(
        params.targetEntity.name,
        params.targetId,
        params.tenantId,
      );
      if (!target) {
        throw new RelationError(
          RelationErrorCode.RELATION_NOT_FOUND,
          `Target ${params.targetEntity.name} "${params.targetId}" was not found.`,
        );
      }

      const joinCollection =
        params.joinCollection ??
        resolveJoinCollectionName(
          params.sourceEntity.name,
          params.targetEntity.name,
          {
            target: params.targetEntity.name,
            type: "many-to-many",
          },
        );

      return joinRepository.link(params.tenantId, {
        joinCollection,
        sourceEntity: params.sourceEntity.name,
        sourceId: params.sourceId,
        targetEntity: params.targetEntity.name,
        targetId: params.targetId,
      });
    },

    async unlink(
      tenantId: string,
      joinCollection: string,
      joinId: string,
    ): Promise<boolean> {
      return joinRepository.unlink(tenantId, joinCollection, joinId);
    },

    async findLinkedTargets(
      tenantId: string,
      sourceEntity: AnyDefinedEntity,
      sourceId: string,
      targetEntity: AnyDefinedEntity,
      joinCollection?: string,
    ): Promise<readonly JoinRecord[]> {
      const resolvedJoinCollection =
        joinCollection ??
        resolveJoinCollectionName(
          sourceEntity.name,
          targetEntity.name,
          {
            target: targetEntity.name,
            type: "many-to-many",
          },
        );

      return joinRepository.findBySource(tenantId, {
        joinCollection: resolvedJoinCollection,
        sourceEntity: sourceEntity.name,
        sourceId,
        targetEntity: targetEntity.name,
      });
    },

    async findLinkedSources(
      tenantId: string,
      targetEntity: AnyDefinedEntity,
      targetId: string,
      sourceEntity: AnyDefinedEntity,
      joinCollection?: string,
    ): Promise<readonly JoinRecord[]> {
      const resolvedJoinCollection =
        joinCollection ??
        resolveJoinCollectionName(
          sourceEntity.name,
          targetEntity.name,
          {
            target: targetEntity.name,
            type: "many-to-many",
          },
        );

      return joinRepository.findByTarget(tenantId, {
        joinCollection: resolvedJoinCollection,
        targetEntity: targetEntity.name,
        targetId,
        sourceEntity: sourceEntity.name,
      });
    },
  };
}
