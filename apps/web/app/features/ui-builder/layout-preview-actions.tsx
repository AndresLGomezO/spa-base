import type { ReactNode } from "react";
import type { UiLayoutDocument } from "@repo/ui-builder-core";
import { CardActionsMenu } from "@repo/ui";
import type { TFunction } from "i18next";

/** Non-interactive actions menu for layout design preview (matches live card placement). */
export function layoutPreviewActions(
  layout: UiLayoutDocument,
  t: TFunction<"common">,
): ReactNode | undefined {
  if (layout.showActions === false) {
    return undefined;
  }

  return (
    <CardActionsMenu
      triggerLabel={t("entity.actions")}
      actions={[
        {
          id: "view",
          label: t("entity.view"),
          onSelect: () => undefined,
        },
        {
          id: "edit",
          label: t("entity.edit"),
          onSelect: () => undefined,
        },
        {
          id: "share",
          label: t("entity.share"),
          onSelect: () => undefined,
        },
        {
          id: "delete",
          label: t("entity.delete"),
          onSelect: () => undefined,
          destructive: true,
        },
      ]}
    />
  );
}
