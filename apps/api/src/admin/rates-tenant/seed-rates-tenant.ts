import {
  createFirestoreAdminEntityCategoryRepository,
  createFirestoreAdminEntityDefinitionRepository,
  createFirestoreAdminTenantRoleRepository,
  type FirebaseAdminConfig,
} from "@repo/gcp-firebase";

import { RATES_CATEGORY_NAMES } from "./constants.js";
import { RATES_ENTITY_CATEGORIES } from "./categories.js";
import { buildRatesCustomRoles } from "./roles.js";
import {
  buildRatesEntityDefinitions,
  type RatesNavCategoryIds,
} from "./definitions/index.js";
import {
  seedRatesBusinessRecordsForOwner,
  seedRatesLookupRecords,
} from "./records/index.js";
import { seedRatesTestUser } from "./seed-rates-test-user.js";
import {
  ensureRatesRole,
  seedRatesCategories,
  seedRatesDefinitions,
} from "./seed-helpers.js";

export async function seedRatesTenantMock(
  firebaseAdminConfig: FirebaseAdminConfig,
): Promise<void> {
  const categoryRepository =
    createFirestoreAdminEntityCategoryRepository(firebaseAdminConfig);
  const definitionRepository =
    createFirestoreAdminEntityDefinitionRepository(firebaseAdminConfig);
  const roleRepository =
    createFirestoreAdminTenantRoleRepository(firebaseAdminConfig);

  const categoryIdsByName = await seedRatesCategories(
    categoryRepository,
    RATES_ENTITY_CATEGORIES,
  );

  const navCategoryIds: RatesNavCategoryIds = {
    referenceData: categoryIdsByName[RATES_CATEGORY_NAMES.referenceData]!,
    portfolio: categoryIdsByName[RATES_CATEGORY_NAMES.portfolio]!,
    transactions: categoryIdsByName[RATES_CATEGORY_NAMES.transactions]!,
    extensions: categoryIdsByName[RATES_CATEGORY_NAMES.extensions]!,
  };

  const definitions = buildRatesEntityDefinitions(navCategoryIds);
  const definitionRecords = await seedRatesDefinitions(
    definitionRepository,
    definitions,
  );

  for (const role of buildRatesCustomRoles()) {
    await ensureRatesRole(roleRepository, role);
  }

  const testUserUid = await seedRatesTestUser(firebaseAdminConfig);

  await seedRatesLookupRecords(
    firebaseAdminConfig,
    definitionRecords,
    testUserUid,
  );
  await seedRatesBusinessRecordsForOwner(
    firebaseAdminConfig,
    definitionRecords,
    testUserUid,
  );
}
