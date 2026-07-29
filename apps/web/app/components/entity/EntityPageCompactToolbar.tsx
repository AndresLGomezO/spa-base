import type { ComponentProps } from "react";

import { WebDataViewToolbar } from "../data-view/WebDataViewToolbar";

interface EntityPageCompactToolbarProps {
  readonly toolbar: Omit<ComponentProps<typeof WebDataViewToolbar>, "compact">;
}

export function EntityPageCompactToolbar({
  toolbar,
}: EntityPageCompactToolbarProps) {
  return (
    <div className="relative z-20 shrink-0">
      <WebDataViewToolbar {...toolbar} compact={false} />
    </div>
  );
}
