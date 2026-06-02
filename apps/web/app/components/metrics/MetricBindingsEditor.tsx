import type { MetricBindingSource, MetricWidgetBindings } from "@repo/entities";
import type { SerializableEntityDefinition } from "@repo/entities";

import { listRequiredMetricQueryFields } from "../../lib/metric-query-utils.js";
import type { MetricDefinitionRecord } from "../../lib/api-client.js";
import { MetricBindingSourceEditor } from "./MetricBindingSourceEditor.js";

interface MetricBindingsEditorProps {
  readonly metric: MetricDefinitionRecord;
  readonly bindings: MetricWidgetBindings;
  readonly entityDefinition: SerializableEntityDefinition;
  readonly filterFieldOptions: readonly string[];
  readonly onChange: (bindings: MetricWidgetBindings) => void;
}

export function MetricBindingsEditor({
  metric,
  bindings,
  entityDefinition,
  filterFieldOptions,
  onChange,
}: MetricBindingsEditorProps) {
  const required = listRequiredMetricQueryFields(metric);

  function updateGroupBinding(field: string, source: MetricBindingSource) {
    onChange({
      ...bindings,
      groupBindings: { ...bindings.groupBindings, [field]: source },
    });
  }

  function updateDimensionBinding(field: string, source: MetricBindingSource) {
    onChange({
      ...bindings,
      dimensionBindings: { ...bindings.dimensionBindings, [field]: source },
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {required.groupBy.length > 0 ? (
        <div className="flex flex-col gap-2">
          {required.groupBy.map((field) => (
            <MetricBindingSourceEditor
              key={`group-${field}`}
              fieldName={field}
              source={bindings.groupBindings[field]}
              definition={entityDefinition}
              filterFieldOptions={filterFieldOptions}
              onChange={(source) => updateGroupBinding(field, source)}
            />
          ))}
        </div>
      ) : null}
      {required.dimensions.length > 0 ? (
        <div className="flex flex-col gap-2">
          {required.dimensions.map((field) => (
            <MetricBindingSourceEditor
              key={`dimension-${field}`}
              fieldName={field}
              source={bindings.dimensionBindings[field]}
              definition={entityDefinition}
              filterFieldOptions={filterFieldOptions}
              onChange={(source) => updateDimensionBinding(field, source)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
