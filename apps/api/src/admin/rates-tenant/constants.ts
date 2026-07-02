export const RATES_TENANT_ID = "rates" as const;
export const RATES_TENANT_NAME = "Rates" as const;

/** Dev-only Auth emulator user for local Rates demos. */
export const RATES_TEST_USER_EMAIL = "testuser1@rates.com" as const;
export const RATES_TEST_USER_UID = "rates_testuser1" as const;
export const RATES_TEST_USER_PASSWORD = "RatesTest1!" as const;
export const RATES_TEST_USER_DISPLAY_NAME = "Rates Test User 1" as const;

/** Default owner for `.local/tenant-import/` JSON when bootstrap env is unset. */
export const RATES_LOCAL_IMPORT_OWNER_EMAIL =
  "andreslgomezo@gmail.com" as const;

export const RATES_NORMAL_RATES_USER_ROLE = "normalRatesUser" as const;
export const RATES_LOCAL_IMPORT_TENANT_ROLE = "admin" as const;

/** GCP Rates Dev demo owner uid (used by `.local/ingestion` wrapper only). */
export const RATES_GCP_DEMO_OWNER_UID = "bq8nxIpwrFhrmM1KjaVfdBzqTyC3" as const;
export const RATES_GCP_DEMO_USER_ROLE = "admin" as const;
