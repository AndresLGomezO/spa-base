import { ItemListDesignerGroupedColumnHeaderField } from "./ItemListDesignerGroupedColumnHeaderField";

interface ItemListDesignerGroupedColumnPanelProps {
  readonly columnIndex: number;
}

export function ItemListDesignerGroupedColumnPanel({
  columnIndex,
}: ItemListDesignerGroupedColumnPanelProps) {
  return (
    <div className="flex flex-col gap-3">
      <ItemListDesignerGroupedColumnHeaderField columnIndex={columnIndex} />
    </div>
  );
}
