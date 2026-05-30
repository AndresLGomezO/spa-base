import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { FieldLabel, toast } from "@repo/ui";

import { listHooks, type HookRecord } from "../../lib/api-client";
import { FormModal } from "../forms/FormModal";
import { HookEditor } from "./HookEditor";
import { HookList } from "./HookList";

interface HookManagerProps {
  readonly tenantId: string;
  readonly canCreate?: boolean;
  readonly canUpdate?: boolean;
  readonly showTenantPicker?: boolean;
  readonly tenantOptions?: readonly {
    readonly id: string;
    readonly name: string;
  }[];
  readonly onTenantChange?: (tenantId: string) => void;
}

export function HookManager({
  tenantId,
  canCreate = true,
  canUpdate = true,
  showTenantPicker = false,
  tenantOptions = [],
  onTenantChange,
}: HookManagerProps) {
  const { t } = useTranslation("common");
  const [items, setItems] = useState<readonly HookRecord[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const editingHook =
    editingId === null
      ? null
      : (items.find((item) => item.id === editingId) ?? null);

  const loadHooks = useCallback(async () => {
    if (!tenantId) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const result = await listHooks();
      setItems(result.items);
    } catch (loadError) {
      toast.error(
        loadError instanceof Error ? loadError.message : t("hooks.loadFailed"),
      );
    } finally {
      setIsLoading(false);
    }
  }, [t, tenantId]);

  useEffect(() => {
    void loadHooks();
  }, [loadHooks]);

  function closeModal() {
    setIsCreating(false);
    setEditingId(null);
  }

  function handleSaved(hook: HookRecord) {
    setItems((current) => {
      const index = current.findIndex((item) => item.id === hook.id);
      if (index === -1) {
        return [...current, hook].sort((left, right) =>
          left.name.localeCompare(right.name),
        );
      }
      return current.map((item) => (item.id === hook.id ? hook : item));
    });
    closeModal();
  }

  const modalOpen = isCreating || editingId !== null;
  const modalTitle = useMemo(() => {
    if (isCreating) {
      return t("hooks.createTitle");
    }
    return t("hooks.editTitle", { name: editingHook?.name ?? "" });
  }, [editingHook?.name, isCreating, t]);

  return (
    <div className="space-y-6">
      {showTenantPicker ? (
        <div className="max-w-md">
          <FieldLabel htmlFor="hook-tenant">{t("hooks.tenant")}</FieldLabel>
          <select
            id="hook-tenant"
            className="border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm"
            value={tenantId}
            onChange={(event) => onTenantChange?.(event.target.value)}
          >
            {tenantOptions.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <HookList
        items={items}
        isLoading={isLoading}
        canCreate={canCreate}
        canUpdate={canUpdate}
        onCreate={() => setIsCreating(true)}
        onEdit={(id) => setEditingId(id)}
      />

      <FormModal
        open={modalOpen}
        onClose={closeModal}
        title={modalTitle}
        size="lg"
      >
        {modalOpen ? (
          <HookEditor
            key={isCreating ? "create" : (editingId ?? "edit")}
            hook={isCreating ? null : editingHook}
            canCreate={canCreate}
            canUpdate={canUpdate}
            onSaved={handleSaved}
            onCancel={closeModal}
          />
        ) : null}
      </FormModal>
    </div>
  );
}
