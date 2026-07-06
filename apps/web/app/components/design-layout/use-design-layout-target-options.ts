import { hasPermission } from "@repo/rbac";
import { useMemo } from "react";

import { useAuth } from "../../auth/AuthContext";
import { useCustomViewCatalog } from "../../custom-views/custom-view-catalog-context";
import { getCustomViewLabel } from "../../custom-views/custom-view-definition";
import { encodeDesignLayoutTarget } from "./design-layout-target";
import type { DesignLayoutEntityKind } from "./design-layout-kind";
import {
  useDesignLayoutEntityOptions,
  type DesignLayoutEntityOption,
} from "./use-design-layout-entity-options";

interface DesignLayoutTargetOption {
  readonly value: string;
  readonly label: string;
}

interface DesignLayoutTargetOptionGroup {
  readonly labelKey:
    | "designLayout.targetGroup.entities"
    | "designLayout.targetGroup.customViews";
  readonly options: readonly DesignLayoutTargetOption[];
}

function compareLabels(left: string, right: string): number {
  return left.localeCompare(right);
}

function mapEntityOptions(
  options: readonly DesignLayoutEntityOption[],
): DesignLayoutTargetOption[] {
  return options.map((option) => ({
    value: encodeDesignLayoutTarget({
      kind: "entity",
      entityName: option.value,
    }),
    label: option.label,
  }));
}

export function useDesignLayoutTargetOptions(kind: DesignLayoutEntityKind) {
  const { permissions, isSuperAdmin } = useAuth();
  const { items: customViewItems, isLoading: isCustomViewCatalogLoading } =
    useCustomViewCatalog();
  const {
    options: entityOptions,
    defaultEntity,
    isLoading: isEntityOptionsLoading,
    canAccessDesignLayout,
  } = useDesignLayoutEntityOptions(kind);

  const supportsCustomViews =
    kind === "main" || kind === "list" || kind === "metrics";

  const customViewOptions = useMemo((): DesignLayoutTargetOption[] => {
    if (!supportsCustomViews) {
      return [];
    }

    return customViewItems
      .filter((view) => {
        if (view.status !== "ACTIVE") {
          return false;
        }
        if (
          !hasPermission("customView.read", permissions, { isSuperAdmin }) ||
          !hasPermission("entityUiOverride.read", permissions, {
            isSuperAdmin,
          })
        ) {
          return false;
        }
        return hasPermission(`${view.sourceEntity}.read`, permissions, {
          isSuperAdmin,
        });
      })
      .map((view) => ({
        value: encodeDesignLayoutTarget({
          kind: "customView",
          customViewId: view.viewId,
        }),
        label: getCustomViewLabel(view),
      }))
      .sort((left, right) => compareLabels(left.label, right.label));
  }, [customViewItems, isSuperAdmin, permissions, supportsCustomViews]);

  const optionGroups = useMemo((): readonly DesignLayoutTargetOptionGroup[] => {
    const entityTargetOptions = mapEntityOptions(entityOptions);

    if (!supportsCustomViews || customViewOptions.length === 0) {
      if (entityTargetOptions.length === 0) {
        return [];
      }

      return [
        {
          labelKey: "designLayout.targetGroup.entities",
          options: entityTargetOptions,
        },
      ];
    }

    return [
      {
        labelKey: "designLayout.targetGroup.entities",
        options: entityTargetOptions,
      },
      {
        labelKey: "designLayout.targetGroup.customViews",
        options: customViewOptions,
      },
    ];
  }, [customViewOptions, entityOptions, supportsCustomViews]);

  const isLoading =
    isEntityOptionsLoading ||
    (supportsCustomViews && isCustomViewCatalogLoading);

  return {
    optionGroups,
    defaultEntity,
    isLoading,
    canAccessDesignLayout,
    hasCustomViewOptions: customViewOptions.length > 0,
  };
}
