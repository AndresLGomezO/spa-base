import { useTranslation } from "react-i18next";

import { Button, FieldLabel, Input, Text, Select } from "@repo/ui";

import type { HookAction } from "../../lib/api-client";

const HOOK_EVENT_SUFFIXES = [
  "beforeCreate",
  "afterCreate",
  "beforeUpdate",
  "afterUpdate",
  "beforeDelete",
  "afterDelete",
] as const;

export type HookEventSuffix = (typeof HOOK_EVENT_SUFFIXES)[number];

export function buildHookEvent(
  entity: string,
  suffix: HookEventSuffix,
): string {
  return `${entity}.${suffix}`;
}

export function parseHookEventParts(event: string): {
  readonly suffix: HookEventSuffix;
} | null {
  for (const suffix of HOOK_EVENT_SUFFIXES) {
    if (event.endsWith(`.${suffix}`)) {
      return { suffix };
    }
  }
  return null;
}

interface HookActionEditorProps {
  readonly actions: readonly HookAction[];
  readonly entityNames: readonly {
    readonly name: string;
    readonly label: string;
  }[];
  readonly disabled?: boolean;
  readonly onChange: (actions: readonly HookAction[]) => void;
}

const DEFAULT_ACTION: HookAction = {
  type: "updateField",
  field: "",
  value: "",
};

export function HookActionEditor({
  actions,
  entityNames,
  disabled = false,
  onChange,
}: HookActionEditorProps) {
  const { t } = useTranslation("common");

  function updateAction(index: number, action: HookAction) {
    onChange(
      actions.map((entry, entryIndex) =>
        entryIndex === index ? action : entry,
      ),
    );
  }

  function removeAction(index: number) {
    onChange(actions.filter((_, entryIndex) => entryIndex !== index));
  }

  return (
    <div className="space-y-4">
      {actions.map((action, index) => (
        <div
          key={index}
          className="border-border space-y-3 rounded-lg border p-4"
        >
          <div>
            <FieldLabel htmlFor={`hook-action-type-${index}`}>
              {t("hooks.actionType")}
            </FieldLabel>
            <Select
              id={`hook-action-type-${index}`}
              className="border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm"
              value={action.type}
              disabled={disabled}
              onChange={(event) => {
                const type = event.target.value as HookAction["type"];
                if (type === "updateField") {
                  updateAction(index, {
                    type,
                    field: "",
                    value: "",
                  });
                } else if (type === "createRecord") {
                  updateAction(index, {
                    type,
                    entity: entityNames[0]?.name ?? "",
                    data: {},
                  });
                } else {
                  updateAction(index, {
                    type,
                    message: "",
                  });
                }
              }}
            >
              <option value="updateField">
                {t("hooks.actionTypes.updateField")}
              </option>
              <option value="createRecord">
                {t("hooks.actionTypes.createRecord")}
              </option>
              <option value="sendNotification">
                {t("hooks.actionTypes.sendNotification")}
              </option>
            </Select>
          </div>

          {action.type === "updateField" ? (
            <>
              <div>
                <FieldLabel htmlFor={`hook-action-field-${index}`}>
                  {t("hooks.field")}
                </FieldLabel>
                <Input
                  id={`hook-action-field-${index}`}
                  value={action.field}
                  disabled={disabled}
                  onChange={(event) =>
                    updateAction(index, {
                      ...action,
                      field: event.target.value,
                    })
                  }
                />
              </div>
              <div>
                <FieldLabel htmlFor={`hook-action-value-${index}`}>
                  {t("hooks.value")}
                </FieldLabel>
                <Input
                  id={`hook-action-value-${index}`}
                  value={
                    typeof action.value === "string"
                      ? action.value
                      : JSON.stringify(action.value ?? "")
                  }
                  disabled={disabled}
                  onChange={(event) => {
                    const raw = event.target.value;
                    let value: unknown = raw;
                    try {
                      value = JSON.parse(raw);
                    } catch {
                      value = raw;
                    }
                    updateAction(index, { ...action, value });
                  }}
                />
              </div>
            </>
          ) : null}

          {action.type === "createRecord" ? (
            <>
              <div>
                <FieldLabel htmlFor={`hook-action-entity-${index}`}>
                  {t("hooks.targetEntity")}
                </FieldLabel>
                <Select
                  id={`hook-action-entity-${index}`}
                  className="border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm"
                  value={action.entity}
                  disabled={disabled}
                  onChange={(event) =>
                    updateAction(index, {
                      ...action,
                      entity: event.target.value,
                    })
                  }
                >
                  {entityNames.map((entity) => (
                    <option key={entity.name} value={entity.name}>
                      {entity.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <FieldLabel htmlFor={`hook-action-data-${index}`}>
                  {t("hooks.recordData")}
                </FieldLabel>
                <textarea
                  id={`hook-action-data-${index}`}
                  className="border-input bg-background min-h-24 w-full rounded-md border px-3 py-2 text-sm"
                  value={JSON.stringify(action.data, null, 2)}
                  disabled={disabled}
                  onChange={(event) => {
                    try {
                      const data = JSON.parse(event.target.value) as Record<
                        string,
                        unknown
                      >;
                      updateAction(index, { ...action, data });
                    } catch {
                      // Keep previous data until valid JSON
                    }
                  }}
                />
              </div>
            </>
          ) : null}

          {action.type === "sendNotification" ? (
            <div>
              <FieldLabel htmlFor={`hook-action-message-${index}`}>
                {t("hooks.message")}
              </FieldLabel>
              <Input
                id={`hook-action-message-${index}`}
                value={action.message}
                disabled={disabled}
                onChange={(event) =>
                  updateAction(index, {
                    ...action,
                    message: event.target.value,
                  })
                }
              />
            </div>
          ) : null}

          {!disabled ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => removeAction(index)}
            >
              {t("hooks.removeAction")}
            </Button>
          ) : null}
        </div>
      ))}

      {!disabled ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => onChange([...actions, { ...DEFAULT_ACTION }])}
        >
          {t("hooks.addAction")}
        </Button>
      ) : null}

      {actions.length === 0 ? (
        <Text className="text-muted-foreground text-sm">
          {t("hooks.validation.actionsRequired")}
        </Text>
      ) : null}
    </div>
  );
}

export { HOOK_EVENT_SUFFIXES };
