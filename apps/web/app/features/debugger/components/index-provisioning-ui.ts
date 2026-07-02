import type { IndexProvisioningJobPhase } from "../../../lib/api-client";

export function phaseToIndexProvisioningBadgeStatus(
  phase: IndexProvisioningJobPhase,
): string {
  switch (phase) {
    case "creating":
      return "running";
    case "ready":
      return "success";
    case "error":
      return "error";
    default:
      return "info";
  }
}

export function shortIndexSignature(signature: string): string {
  return signature.length <= 12 ? signature : `${signature.slice(0, 12)}…`;
}
