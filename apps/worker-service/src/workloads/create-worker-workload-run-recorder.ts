import {
  createFirestoreAdminWorkloadRunRepository,
  type FirebaseAdminConfig,
} from "@repo/gcp-firebase";
import {
  createWorkloadRunRecorder,
  type WorkloadRunRecorder,
} from "@repo/workload-runs";

export function createWorkerWorkloadRunRecorder(
  firebaseAdminConfig: FirebaseAdminConfig,
): WorkloadRunRecorder {
  const repository =
    createFirestoreAdminWorkloadRunRepository(firebaseAdminConfig);
  return createWorkloadRunRecorder({ repository });
}
