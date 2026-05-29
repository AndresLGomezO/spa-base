export interface JoinRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly joinCollection: string;
  readonly sourceEntity: string;
  readonly sourceId: string;
  readonly targetEntity: string;
  readonly targetId: string;
  readonly createdAt: string;
}

export interface LinkJoinParams {
  readonly joinCollection: string;
  readonly sourceEntity: string;
  readonly sourceId: string;
  readonly targetEntity: string;
  readonly targetId: string;
}

export interface FindJoinBySourceParams {
  readonly joinCollection: string;
  readonly sourceEntity: string;
  readonly sourceId: string;
  readonly targetEntity: string;
}

export interface FindJoinByTargetParams {
  readonly joinCollection: string;
  readonly targetEntity: string;
  readonly targetId: string;
  readonly sourceEntity: string;
}

export interface JoinCollectionRepository {
  link(tenantId: string, params: LinkJoinParams): Promise<JoinRecord>;
  unlink(
    tenantId: string,
    joinCollection: string,
    joinId: string,
  ): Promise<boolean>;
  findBySource(
    tenantId: string,
    params: FindJoinBySourceParams,
  ): Promise<readonly JoinRecord[]>;
  findByTarget(
    tenantId: string,
    params: FindJoinByTargetParams,
  ): Promise<readonly JoinRecord[]>;
  deleteByEntityId(
    tenantId: string,
    joinCollection: string,
    entityName: string,
    entityId: string,
  ): Promise<number>;
}
