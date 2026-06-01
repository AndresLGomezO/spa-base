import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";

import { FieldLabel, Text, toast } from "@repo/ui";

import {
  listEntityDefinitions,
  type EntityDefinitionRecord,
} from "../../lib/api-client";
import { useEntityCatalog } from "../../entities/entity-catalog-context";
import { FormModal } from "../forms/FormModal";
import { EntityDefinitionList } from "./EntityDefinitionList";
import { EntityDefinitionWizard } from "./EntityDefinitionWizard";
import { EntityDefinitionEditor } from "./EntityDefinitionEditor";

interface DataModelManagerProps {
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

export function DataModelManager({
  tenantId,
  canCreate = true,
  canUpdate = true,
  showTenantPicker = false,
  tenantOptions = [],
  onTenantChange,
}: DataModelManagerProps) {
  const { t } = useTranslation("common");
  const { refresh: refreshEntityCatalog } = useEntityCatalog();
  const [items, setItems] = useState<readonly EntityDefinitionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalFooter, setModalFooter] = useState<ReactNode | null>(null);

  const editingRecord =
    editingId === null
      ? null
      : (items.find((item) => item.id === editingId) ?? null);

  const loadDefinitions = useCallback(async () => {
    if (!tenantId) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const result = await listEntityDefinitions();
      setItems(result.items);
    } catch (loadError) {
      toast.error(
        loadError instanceof Error
          ? loadError.message
          : t("dataModels.loadFailed"),
      );
    } finally {
      setIsLoading(false);
    }
  }, [t, tenantId]);

  useEffect(() => {
    void loadDefinitions();
  }, [loadDefinitions]);

  const closeModal = useCallback(() => {
    setShowWizard(false);
    setEditingId(null);
    setModalFooter(null);
  }, []);

  const modalOpen = showWizard || editingId !== null;
  const modalTitle = useMemo(() => {
    if (showWizard) {
      return t("dataModels.createModel");
    }
    return t("dataModels.editTitle", { name: editingRecord?.name ?? "" });
  }, [editingRecord?.name, showWizard, t]);

  return (
    <div className="flex min-h-full flex-col gap-6">
      {showTenantPicker ? (
        <div className="max-w-md">
          <FieldLabel htmlFor="data-model-tenant">
            {t("dataModels.tenant")}
          </FieldLabel>
          <select
            id="data-model-tenant"
            className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
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

      <div className="flex min-h-0 flex-1 flex-col">
        <EntityDefinitionList
          items={items}
          isLoading={isLoading}
          canCreate={canCreate}
          canUpdate={canUpdate}
          onCreate={() => setShowWizard(true)}
          onEdit={(id) => setEditingId(id)}
        />
      </div>

      {!modalOpen && !isLoading && items.length > 0 ? (
        <Text className="text-muted-foreground text-sm">
          {t("dataModels.catalogHint")}
        </Text>
      ) : null}

      <FormModal
        open={modalOpen}
        onClose={closeModal}
        title={modalTitle}
        size="xl"
        footer={modalFooter}
      >
        {showWizard ? (
          <EntityDefinitionWizard
            onCancel={closeModal}
            onFooterChange={setModalFooter}
            onCreated={() => {
              closeModal();
              void loadDefinitions();
              void refreshEntityCatalog();
            }}
          />
        ) : editingId ? (
          <EntityDefinitionEditor
            key={editingId}
            definitionId={editingId}
            tenantId={tenantId}
            canUpdate={canUpdate}
            onCancel={closeModal}
            onFooterChange={setModalFooter}
            onSaved={() => {
              closeModal();
              void loadDefinitions();
              void refreshEntityCatalog();
            }}
          />
        ) : null}
      </FormModal>
    </div>
  );
}
