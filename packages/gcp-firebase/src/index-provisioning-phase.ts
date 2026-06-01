import type { IndexStatusRecord } from "./firestore-index-status.js";

export type IndexProvisioningPhase = "idle" | "building" | "ready" | "error";

export interface IndexProvisioningStatusSummary {
  readonly collection: string;
  readonly phase: IndexProvisioningPhase;
  readonly records: readonly IndexStatusRecord[];
  readonly creatingCount: number;
  readonly readyCount: number;
  readonly errorCount: number;
}

export function summarizeIndexProvisioningStatus(
  collection: string,
  records: readonly IndexStatusRecord[],
): IndexProvisioningStatusSummary {
  const creatingCount = records.filter(
    (record) => record.status === "CREATING",
  ).length;
  const readyCount = records.filter(
    (record) => record.status === "READY",
  ).length;
  const errorCount = records.filter(
    (record) => record.status === "ERROR",
  ).length;

  let phase: IndexProvisioningPhase = "idle";
  if (records.length === 0) {
    phase = "idle";
  } else if (creatingCount > 0) {
    phase = "building";
  } else if (errorCount > 0) {
    phase = "error";
  } else if (readyCount === records.length) {
    phase = "ready";
  }

  return {
    collection,
    phase,
    records,
    creatingCount,
    readyCount,
    errorCount,
  };
}
