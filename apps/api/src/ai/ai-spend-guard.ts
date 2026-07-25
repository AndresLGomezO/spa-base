import {
  aiSpendPeriodKey,
  assertAiSpendAllowed,
  buildAiSpendStatus,
  emptyAiSpendCounters,
  isAttributableAiUserId,
  resolveRoleAiSpendLimits,
  type AiSpendRepository,
  type AiSpendStatus,
  type RoleAiSpendLimitsSource,
} from "@repo/ai-engine/spend";
import type { TenantRepository } from "@repo/firestore-converters";
import type { RegisteredUserRepository } from "@repo/firestore-converters";

export interface AiSpendGuardDeps {
  readonly tenantRepository: TenantRepository;
  readonly aiSpendRepository: AiSpendRepository;
  readonly getRoleCatalog?: (
    tenantId: string,
  ) => Promise<RoleAiSpendLimitsSource>;
  readonly registeredUserRepository?: RegisteredUserRepository;
  readonly now?: () => Date;
}

export async function assertAiSpendAllowedForRequest(
  deps: AiSpendGuardDeps,
  input: {
    readonly tenantId: string;
    readonly userId?: string | null;
    readonly roleCatalog?: RoleAiSpendLimitsSource | null;
    readonly tenantRoleNames?: readonly string[] | null;
  },
): Promise<void> {
  const period = aiSpendPeriodKey(deps.now?.() ?? new Date());
  const tenant = await deps.tenantRepository.getById(input.tenantId);
  const tenantLimits = tenant?.aiLimits;

  const attributable = isAttributableAiUserId(input.userId);
  let roleLimits = resolveRoleAiSpendLimits(
    input.roleCatalog,
    input.tenantRoleNames,
  );

  // Only resolve roles from storage when the caller did not already supply
  // permission context (e.g. worker paths). Avoid a second Firestore round-trip
  // after API routes have loaded the catalog via loadRequestPermissions.
  if (
    attributable &&
    !roleLimits &&
    input.roleCatalog === undefined &&
    input.tenantRoleNames === undefined &&
    deps.getRoleCatalog &&
    deps.registeredUserRepository &&
    input.userId
  ) {
    const [catalog, profile] = await Promise.all([
      deps.getRoleCatalog(input.tenantId),
      deps.registeredUserRepository.getByUid(input.userId),
    ]);
    const roleNames = profile?.tenants?.[input.tenantId] ?? [];
    roleLimits = resolveRoleAiSpendLimits(catalog, roleNames);
  }

  const [tenantSpend, userSpend] = await Promise.all([
    deps.aiSpendRepository.getTenantPeriod(input.tenantId, period),
    attributable && input.userId
      ? deps.aiSpendRepository.getUserPeriod(
          input.tenantId,
          input.userId.trim(),
          period,
        )
      : Promise.resolve(null),
  ]);

  assertAiSpendAllowed({
    tenantLimits,
    roleLimits,
    tenantUsed: tenantSpend ?? emptyAiSpendCounters(),
    userUsed: userSpend ?? emptyAiSpendCounters(),
    checkRole: attributable,
  });
}

export async function getAiSpendStatusForUser(
  deps: AiSpendGuardDeps,
  input: {
    readonly tenantId: string;
    readonly userId: string;
    readonly roleCatalog?: RoleAiSpendLimitsSource | null;
    readonly tenantRoleNames?: readonly string[] | null;
  },
): Promise<AiSpendStatus> {
  const period = aiSpendPeriodKey(deps.now?.() ?? new Date());
  const tenant = await deps.tenantRepository.getById(input.tenantId);
  const tenantLimits = tenant?.aiLimits;

  let roleLimits = resolveRoleAiSpendLimits(
    input.roleCatalog,
    input.tenantRoleNames,
  );

  if (
    !roleLimits &&
    input.roleCatalog === undefined &&
    input.tenantRoleNames === undefined &&
    deps.getRoleCatalog &&
    deps.registeredUserRepository
  ) {
    const [catalog, profile] = await Promise.all([
      deps.getRoleCatalog(input.tenantId),
      deps.registeredUserRepository.getByUid(input.userId),
    ]);
    const roleNames = profile?.tenants?.[input.tenantId] ?? [];
    roleLimits = resolveRoleAiSpendLimits(catalog, roleNames);
  }

  const [tenantSpend, userSpend] = await Promise.all([
    deps.aiSpendRepository.getTenantPeriod(input.tenantId, period),
    deps.aiSpendRepository.getUserPeriod(input.tenantId, input.userId, period),
  ]);

  return buildAiSpendStatus({
    period,
    tenantLimits,
    roleLimits,
    tenantUsed: tenantSpend,
    userUsed: userSpend,
  });
}
