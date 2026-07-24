import { createPersistingHookLogger } from "@repo/debug-logs";
import {
  createFirestoreAdminDataHookExecutionRepository,
  createFirestoreAdminHookLogMessageRepository,
  createFirestoreAdminPushTokenRepository,
  createFirestoreAdminUserNotificationRepository,
  createSendUserNotificationWithPush,
  type FirebaseAdminConfig,
} from "@repo/gcp-firebase";
import type {
  CreateDataHookExecutionInput,
  DataHookExecutionRecorder,
  HookLogger,
} from "@repo/hooks";
import type { CreateUserNotificationInput } from "@repo/firestore-converters";

import {
  createDataHookExecutionRecorderForTenant,
  createRecordDataHookExecution,
} from "../../hooks/record-data-hook-execution.js";

const seedHookConsoleLogger: HookLogger = {
  info(message, meta) {
    if (meta && Object.keys(meta).length > 0) {
      console.log(`[seed hooks] ${message}`, meta);
      return;
    }
    console.log(`[seed hooks] ${message}`);
  },
  error(message, meta) {
    if (meta?.error) {
      console.error(`[seed hooks] ${message} — ${meta.error}`);
      return;
    }
    if (meta && Object.keys(meta).length > 0) {
      console.error(`[seed hooks] ${message}`, meta);
      return;
    }
    console.error(`[seed hooks] ${message}`);
  },
};

interface SeedHookObservabilityServices {
  readonly logger: HookLogger;
  readonly recordDataHookExecution?: (
    entry: CreateDataHookExecutionInput,
  ) => Promise<void>;
  readonly dataHookExecutionRecorder?: DataHookExecutionRecorder;
  readonly sendUserNotification?: (
    input: CreateUserNotificationInput,
  ) => Promise<void>;
}

export function buildSeedHookObservabilityServices(options: {
  readonly observabilityEnabled: boolean;
  readonly tenantId: string;
  readonly firebaseAdminConfig: FirebaseAdminConfig;
}): SeedHookObservabilityServices {
  if (!options.observabilityEnabled) {
    return { logger: seedHookConsoleLogger };
  }

  const hookExecutionRepository =
    createFirestoreAdminDataHookExecutionRepository(
      options.firebaseAdminConfig,
    );
  const hookLogMessageRepository = createFirestoreAdminHookLogMessageRepository(
    options.firebaseAdminConfig,
  );
  const userNotificationRepository =
    createFirestoreAdminUserNotificationRepository(options.firebaseAdminConfig);
  const pushTokenRepository = createFirestoreAdminPushTokenRepository(
    options.firebaseAdminConfig,
  );

  return {
    logger: createPersistingHookLogger({
      base: seedHookConsoleLogger,
      repository: hookLogMessageRepository,
      tenantId: options.tenantId,
    }),
    recordDataHookExecution: createRecordDataHookExecution(
      hookExecutionRepository,
      options.tenantId,
    ),
    dataHookExecutionRecorder: createDataHookExecutionRecorderForTenant(
      hookExecutionRepository,
      options.tenantId,
    ),
    sendUserNotification: createSendUserNotificationWithPush({
      userNotificationRepository,
      tenantId: options.tenantId,
      pushTokenRepository,
      firebaseAdminConfig: options.firebaseAdminConfig,
      onPushError: (error) => {
        seedHookConsoleLogger.error("Failed to deliver web push notification", {
          error: error instanceof Error ? error.message : String(error),
        });
      },
    }),
  };
}
