import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  Alert,
  Button,
  Checkbox,
  FieldLabel,
  Form,
  Heading,
  Input,
  Text,
} from "@repo/ui";

import { useEntityCatalog } from "../../entities/entity-catalog-context";
import { getEntityLabel } from "../../entities/entity-catalog";
import {
  createHook,
  isApiClientError,
  patchHook,
  type HookRecord,
} from "../../lib/api-client";
import {
  buildHookEvent,
  HookActionEditor,
  HOOK_EVENT_SUFFIXES,
  parseHookEventParts,
  type HookEventSuffix,
} from "./HookActionEditor";

interface HookEditorProps {
  readonly tenantId: string;
  readonly hook: HookRecord | null;
  readonly canCreate: boolean;
  readonly canUpdate: boolean;
  readonly onSaved: (hook: HookRecord) => void;
  readonly onCancel: () => void;
}

export function HookEditor({
  tenantId,
  hook,
  canCreate,
  canUpdate,
  onSaved,
  onCancel,
}: HookEditorProps) {
  const { t } = useTranslation("common");
  const { items: entities } = useEntityCatalog();
  const isCreate = hook === null;

  const entityOptions = useMemo(
    () =>
      entities.map((entity) => ({
        name: entity.name,
        label: getEntityLabel(entity),
      })),
    [entities],
  );

  const initialEntity = hook?.entity ?? entityOptions[0]?.name ?? "";
  const initialSuffix =
    (hook ? parseHookEventParts(hook.event)?.suffix : null) ?? "beforeCreate";

  const [name, setName] = useState(hook?.name ?? "");
  const [entity, setEntity] = useState(initialEntity);
  const [eventSuffix, setEventSuffix] =
    useState<HookEventSuffix>(initialSuffix);
  const [enabled, setEnabled] = useState(hook?.enabled ?? true);
  const [actions, setActions] = useState(hook?.config.actions ?? []);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const event = entity ? buildHookEvent(entity, eventSuffix) : "";

  async function handleSave() {
    setError(null);

    if (!name.trim()) {
      setError(t("hooks.validation.nameRequired"));
      return;
    }
    if (!entity.trim()) {
      setError(t("hooks.validation.entityRequired"));
      return;
    }
    if (actions.length === 0) {
      setError(t("hooks.validation.actionsRequired"));
      return;
    }

    setIsSaving(true);

    try {
      if (isCreate) {
        if (!canCreate) {
          throw new Error(t("hooks.forbiddenCreate"));
        }
        const created = await createHook({
          tenantId,
          name: name.trim(),
          entity: entity.trim(),
          event,
          type: "action",
          config: { actions },
          enabled,
        });
        onSaved(created);
        return;
      }

      if (!canUpdate || !hook) {
        throw new Error(t("hooks.forbiddenUpdate"));
      }

      const updated = await patchHook(
        hook.id,
        {
          name: name.trim(),
          config: { actions },
          enabled,
        },
        { tenantId },
      );
      onSaved(updated);
    } catch (saveError) {
      if (isApiClientError(saveError)) {
        setError(saveError.message);
      } else {
        setError(
          saveError instanceof Error
            ? saveError.message
            : t("hooks.saveFailed"),
        );
      }
    } finally {
      setIsSaving(false);
    }
  }

  const readOnly = !isCreate && !canUpdate;

  return (
    <div className="space-y-4">
      <Heading level={2}>
        {isCreate
          ? t("hooks.createTitle")
          : t("hooks.editTitle", { name: hook.name })}
      </Heading>

      {error ? <Alert>{error}</Alert> : null}

      <Form
        onSubmit={(event) => {
          event.preventDefault();
          void handleSave();
        }}
        className="space-y-4"
      >
        <div>
          <FieldLabel htmlFor="hook-name">{t("hooks.name")}</FieldLabel>
          <Input
            id="hook-name"
            value={name}
            disabled={readOnly}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div>
          <FieldLabel htmlFor="hook-entity">{t("hooks.entity")}</FieldLabel>
          <select
            id="hook-entity"
            className="border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm"
            value={entity}
            disabled={!isCreate || readOnly}
            onChange={(event) => setEntity(event.target.value)}
          >
            {entityOptions.map((option) => (
              <option key={option.name} value={option.name}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabel htmlFor="hook-event">{t("hooks.event")}</FieldLabel>
          <select
            id="hook-event"
            className="border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm"
            value={eventSuffix}
            disabled={!isCreate || readOnly}
            onChange={(event) =>
              setEventSuffix(event.target.value as HookEventSuffix)
            }
          >
            {HOOK_EVENT_SUFFIXES.map((suffix) => (
              <option key={suffix} value={suffix}>
                {t(`hooks.events.${suffix}` as "hooks.events.beforeCreate")}
              </option>
            ))}
          </select>
          {event ? (
            <Text className="text-muted-foreground mt-1 text-sm">{event}</Text>
          ) : null}
        </div>

        <Checkbox
          id="hook-enabled"
          label={t("hooks.enabled")}
          checked={enabled}
          disabled={readOnly}
          onChange={(event) => setEnabled(event.target.checked)}
        />

        <div className="space-y-2">
          <Heading level={3}>{t("hooks.actions")}</Heading>
          <HookActionEditor
            actions={actions}
            entityNames={entityOptions}
            disabled={readOnly}
            onChange={setActions}
          />
        </div>

        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t("hooks.cancel")}
          </Button>
          {!readOnly ? (
            <Button type="submit" disabled={isSaving}>
              {isSaving ? t("loading") : t("hooks.save")}
            </Button>
          ) : null}
        </div>
      </Form>
    </div>
  );
}
