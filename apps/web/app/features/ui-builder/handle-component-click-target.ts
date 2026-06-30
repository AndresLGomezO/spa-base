import type { NavigateFunction } from "react-router";
import type { ResolvedComponentClickTarget } from "@repo/ui-builder-core";

import type { EntityFormModalRequest } from "../../components/entity/entity-form-modal-context";

export function isEntityFormModalClickTarget(
  target: ResolvedComponentClickTarget,
): target is Extract<
  ResolvedComponentClickTarget,
  { kind: "entityFormModal" }
> {
  return target.kind === "entityFormModal";
}

function toEntityFormModalRequest(
  target: Extract<ResolvedComponentClickTarget, { kind: "entityFormModal" }>,
): EntityFormModalRequest {
  return {
    entityName: target.entityName,
    mode: target.mode,
    recordId: target.recordId,
    createPrefill: target.createPrefill,
    formDesignId: target.formDesignId,
  };
}

export function handleComponentClickTarget(
  target: ResolvedComponentClickTarget,
  options: {
    readonly navigate?: NavigateFunction;
    readonly openEntityFormModal?: (request: EntityFormModalRequest) => void;
  },
): void {
  if (isEntityFormModalClickTarget(target)) {
    options.openEntityFormModal?.(toEntityFormModalRequest(target));
    return;
  }

  if (target.external || target.openInNewTab) {
    window.open(
      target.href,
      target.openInNewTab ? "_blank" : "_self",
      "noopener,noreferrer",
    );
    return;
  }

  options.navigate?.(target.href, { state: target.state });
}
