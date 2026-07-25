import {
  createAiController,
  createDefaultAiClients,
  type AiController,
  type AiRequest,
} from "@repo/ai-engine/controller";
import {
  assertAiSpendAllowed,
  emptyAiSpendCounters,
  isAttributableAiUserId,
  recordAiSpendUsage,
  resolveRoleAiSpendLimits,
  aiSpendPeriodKey,
  type AiSpendRepository,
  type RoleAiSpendLimitsSource,
} from "@repo/ai-engine/spend";
import type { VertexAiConfig } from "@repo/ai-engine/vertex-ai.client";
import type {
  RegisteredUserRepository,
  TenantRepository,
} from "@repo/firestore-converters";
import type { AiJobRepository } from "@repo/worker-firestore";

export function createWorkerAiController(options: {
  readonly aiJobRepository: AiJobRepository;
  readonly vertexAiConfig: VertexAiConfig;
  readonly isAiEnabled: () => boolean | Promise<boolean>;
  readonly isAiTraceEnabled: () => boolean | Promise<boolean>;
  readonly aiSpendRepository?: AiSpendRepository;
  readonly tenantRepository?: TenantRepository;
  readonly getRoleCatalog?: (
    tenantId: string,
  ) => Promise<RoleAiSpendLimitsSource>;
  readonly registeredUserRepository?: RegisteredUserRepository;
}): AiController {
  const spendRepo = options.aiSpendRepository;
  const tenantRepo = options.tenantRepository;

  async function assertSpendAllowed(request: AiRequest): Promise<void> {
    if (!spendRepo || !tenantRepo) return;

    const period = aiSpendPeriodKey();
    const tenant = await tenantRepo.getById(request.tenantId);
    const tenantLimits = tenant?.aiLimits;
    const attributable = isAttributableAiUserId(request.requestedBy);

    let roleLimits;
    if (
      attributable &&
      options.getRoleCatalog &&
      options.registeredUserRepository
    ) {
      const [catalog, profile] = await Promise.all([
        options.getRoleCatalog(request.tenantId),
        options.registeredUserRepository.getByUid(request.requestedBy),
      ]);
      const roleNames = profile?.tenants?.[request.tenantId] ?? [];
      roleLimits = resolveRoleAiSpendLimits(catalog, roleNames);
    }

    const [tenantSpend, userSpend] = await Promise.all([
      spendRepo.getTenantPeriod(request.tenantId, period),
      attributable
        ? spendRepo.getUserPeriod(
            request.tenantId,
            request.requestedBy.trim(),
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

  return createAiController({
    repository: options.aiJobRepository,
    vertexAiConfig: options.vertexAiConfig,
    clients: createDefaultAiClients(),
    flags: {
      isAiEnabled: options.isAiEnabled,
      isAiTraceEnabled: options.isAiTraceEnabled,
    },
    ...(spendRepo && tenantRepo
      ? {
          assertSpendAllowed,
          recordSpendUsage: async (input) => {
            await recordAiSpendUsage(spendRepo, input);
          },
        }
      : {}),
  });
}
