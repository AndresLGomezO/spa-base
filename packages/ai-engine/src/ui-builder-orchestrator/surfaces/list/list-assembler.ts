import type {
  DefinedEntity,
  FieldDefinitions,
  ListSliceData,
} from "@repo/entities";
import {
  createDefaultUiLayout,
  createLayoutId,
  normalizeLayout,
  type ColumnNode,
  type RowNode,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";

import { componentConfigKey } from "../../layout-path.js";
import type {
  ExpandableColumnMeta,
  ListUiBuilderDraft,
  SkeletonComponentSpec,
} from "../../types.js";
import {
  buildListSliceStub,
  mergeListSliceWithCompanions,
  sanitizeTableFields,
} from "./list-slice-companions.js";
import { repairListLayoutDocument } from "./repair-list-layout-document.js";
import { sanitizeListComponentConfig } from "./sanitize-list-component-config.js";

function buildRowsFromSkeleton(
  skeleton: readonly SkeletonComponentSpec[],
  configs: Readonly<
    Record<string, import("@repo/ui-builder-core").UiComponentConfig>
  >,
  prefix: string,
): RowNode[] {
  const rows: RowNode[] = [];

  for (let index = 0; index < skeleton.length; index++) {
    const spec = skeleton[index]!;
    const path = `${prefix}/${index}`;

    if (spec.kind === "nested-layout") {
      const innerColumns = spec.columns ?? [];
      const columns: ColumnNode[] = innerColumns.map((column, colIndex) => ({
        id: createLayoutId("col"),
        rows: buildRowsFromSkeleton(
          column.components,
          configs,
          `${path}/col${colIndex}`,
        ),
      }));
      rows.push({
        type: "nested-layout",
        id: createLayoutId("nested"),
        columnCount: columns.length,
        columns,
        ...(spec.displayFrom ? { displayFrom: spec.displayFrom } : {}),
        ...(spec.displayTo ? { displayTo: spec.displayTo } : {}),
      });
      continue;
    }

    const config = sanitizeListComponentConfig(
      spec.kind,
      spec.fieldPath ?? "name",
      configs[componentConfigKey(path)],
    );

    rows.push({
      type: "component",
      id: createLayoutId("row"),
      component: config,
      ...(spec.displayFrom ? { displayFrom: spec.displayFrom } : {}),
      ...(spec.displayTo ? { displayTo: spec.displayTo } : {}),
    });
  }

  return rows;
}

export function buildLayoutFromTarget(
  target: ListUiBuilderDraft["layoutTargets"][string],
): UiLayoutDocument {
  const skeleton = target.skeleton ?? [];
  const rows = buildRowsFromSkeleton(skeleton, target.componentConfigs, "root");

  return repairListLayoutDocument(
    normalizeLayout({
      root: {
        type: "root",
        id: createLayoutId("root"),
        columnCount: 1,
        columns: [
          {
            id: createLayoutId("col"),
            rows,
          },
        ],
      },
      showActions: true,
      cardsPerRow: 1,
    }),
    skeleton[0]?.fieldPath ?? "name",
  );
}

function buildExpandableTable(
  draft: ListUiBuilderDraft,
  columns: readonly ExpandableColumnMeta[],
): ListSliceData["expandableTable"] {
  return {
    columns: columns.map((column, index) => {
      const pathKey = `expandableTable.columns[${index}].cellLayout`;
      const target = draft.layoutTargets[pathKey];
      const cellLayout = target
        ? buildLayoutFromTarget(target)
        : createDefaultUiLayout([column.summaryField ?? "name"]);

      return {
        id: column.id,
        ...(column.label ? { label: column.label } : {}),
        ...(column.displayFrom ? { displayFrom: column.displayFrom } : {}),
        ...(column.displayTo ? { displayTo: column.displayTo } : {}),
        cellLayout,
      };
    }),
    rowExpandLayout: buildLayoutFromTarget(
      draft.layoutTargets["expandableTable.rowExpandLayout"] ?? {
        pathKey: "expandableTable.rowExpandLayout",
        label: "Row expand",
        componentConfigs: {},
        skeleton: [{ kind: "text", fieldPath: "name" }],
      },
    ),
    showActions: draft.showActions ?? true,
  };
}

export function assembleListSliceData(
  entity: DefinedEntity<string, FieldDefinitions>,
  draft: ListUiBuilderDraft,
): ListSliceData {
  if (!draft.listViewType) {
    throw new Error("List view type is required to assemble output.");
  }

  const stub = buildListSliceStub(entity);
  let activePartial: Partial<ListSliceData>;

  if (draft.listViewType === "table") {
    activePartial = {
      listViewType: "table",
      table: {
        fields: [
          ...sanitizeTableFields(entity, draft.table?.fields ?? ["name"]),
        ],
        showActions: draft.table?.showActions ?? true,
      },
    };
  } else if (draft.listViewType === "card") {
    const listItemTarget = draft.layoutTargets.listItem;
    activePartial = {
      listViewType: "card",
      listItem: listItemTarget
        ? buildLayoutFromTarget(listItemTarget)
        : createDefaultUiLayout(["name"]),
    };
  } else {
    activePartial = {
      listViewType: "expandableTable",
      expandableTable: buildExpandableTable(
        draft,
        draft.expandableColumns ?? [{ id: "col-1" }],
      ),
    };
  }

  return mergeListSliceWithCompanions(
    entity,
    draft.listViewType,
    activePartial,
    draft.currentLayoutJson,
    stub,
  );
}
