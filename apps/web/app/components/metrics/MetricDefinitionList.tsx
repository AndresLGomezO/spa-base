import { Button, Text } from "@repo/ui";

import type { MetricDefinitionRecord } from "../../lib/api-client";
import { formatAggregationLabel } from "./metric-field-utils";

interface MetricDefinitionListProps {
  readonly items: readonly MetricDefinitionRecord[];
  readonly isLoading: boolean;
  readonly canCreate: boolean;
  readonly canUpdate: boolean;
  readonly onCreate: () => void;
  readonly onEdit: (id: string) => void;
}

export function MetricDefinitionList({
  items,
  isLoading,
  canCreate,
  canUpdate,
  onCreate,
  onEdit,
}: MetricDefinitionListProps) {
  if (isLoading) {
    return <Text>Loading metrics…</Text>;
  }

  return (
    <div className="space-y-3">
      {canCreate ? (
        <Button type="button" onClick={onCreate}>
          New metric
        </Button>
      ) : null}
      {items.length === 0 ? (
        <Text>No metric definitions yet.</Text>
      ) : (
        <ul className="divide-y rounded-md border">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div>
                <Text className="font-medium">{item.name}</Text>
                {item.description ? (
                  <Text className="text-muted-foreground text-sm">
                    {item.description}
                  </Text>
                ) : null}
                <Text className="text-sm text-muted-foreground">
                  {item.sourceModel} ·{" "}
                  {formatAggregationLabel(item.aggregations)} · v{item.version}{" "}
                  · {item.status}
                </Text>
              </div>
              {canUpdate ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onEdit(item.id)}
                >
                  Edit
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
