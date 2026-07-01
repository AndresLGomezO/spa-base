import { JsonTreeViewer } from "../../../components/json-tree/JsonTreeViewer";

export function DebuggerJsonBlock({
  value,
  className,
}: {
  readonly value: unknown;
  readonly className?: string;
}) {
  return (
    <div
      className={`bg-muted/30 max-h-96 overflow-auto rounded-md border p-3 ${className ?? ""}`}
    >
      <JsonTreeViewer value={value} />
    </div>
  );
}
