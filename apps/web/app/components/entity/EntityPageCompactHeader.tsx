import type { ReactNode } from "react";

import { Button, Heading } from "@repo/ui";

interface EntityPageCompactHeaderProps {
  readonly entityLabel: string;
  readonly canConfigureView: boolean;
  readonly canCreate: boolean;
  readonly designLayoutLabel: string;
  readonly createLabel: string;
  readonly onOpenDesignLayout: () => void;
  readonly onCreate: () => void;
  readonly extraActions?: ReactNode;
}

export function EntityPageCompactHeader({
  entityLabel,
  canConfigureView,
  canCreate,
  designLayoutLabel,
  createLabel,
  onOpenDesignLayout,
  onCreate,
  extraActions,
}: EntityPageCompactHeaderProps) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-3 max-lg:gap-2">
      <Heading level={1} className="min-w-0 truncate max-lg:leading-tight">
        {entityLabel}
      </Heading>

      <div className="flex shrink-0 items-center gap-2">
        {extraActions}
        {canConfigureView ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenDesignLayout}
          >
            {designLayoutLabel}
          </Button>
        ) : null}

        {canCreate ? (
          <Button type="button" onClick={onCreate}>
            {createLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
