import type { ListSliceData } from "@repo/entities";

type ActiveListViewType = "card" | "expandableTable";

function normalizeViewType(
  listViewType: ListSliceData["listViewType"],
): ActiveListViewType {
  return listViewType === "compact" ? "expandableTable" : listViewType;
}

export function mergeListSliceForApply(
  current: ListSliceData,
  incoming: ListSliceData,
): ListSliceData {
  const active = normalizeViewType(incoming.listViewType);

  return {
    listViewType: active,
    table: current.table,
    expandableTable:
      active === "expandableTable"
        ? incoming.expandableTable
        : current.expandableTable,
    ...(active === "card"
      ? incoming.listItem
        ? { listItem: incoming.listItem }
        : {}
      : current.listItem
        ? { listItem: current.listItem }
        : {}),
  };
}
