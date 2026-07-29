import type { TenantRepository } from "@repo/firestore-converters";
import type {
  LiveHarvestRepositories,
  LocalePackRepository,
} from "@repo/locale-packs";

export interface LocalePackRuntimeContext {
  readonly repository: LocalePackRepository;
  readonly tenantRepository: TenantRepository;
  readonly harvestRepositories: LiveHarvestRepositories;
}

export function createLocalePackRuntimeContext(input: {
  readonly repository: LocalePackRepository;
  readonly tenantRepository: TenantRepository;
  readonly harvestRepositories: LiveHarvestRepositories;
}): LocalePackRuntimeContext {
  return {
    repository: input.repository,
    tenantRepository: input.tenantRepository,
    harvestRepositories: input.harvestRepositories,
  };
}
