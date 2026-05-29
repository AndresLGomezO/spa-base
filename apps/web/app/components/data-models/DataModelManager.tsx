import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Alert, FieldLabel, Text } from "@repo/ui";

import {
  listEntityDefinitions,
  type EntityDefinitionRecord,
} from "../../lib/api-client";
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
  const [items, setItems] = useState<readonly EntityDefinitionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadDefinitions = useCallback(async () => {
    if (!tenantId) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await listEntityDefinitions({ tenantId });
      setItems(result.items);
    } catch (loadError) {
      setError(
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

  return (
    <div className="space-y-6">
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

      {error ? <Alert>{error}</Alert> : null}

      {showWizard ? (
        <EntityDefinitionWizard
          tenantId={tenantId}
          onCancel={() => setShowWizard(false)}
          onCreated={() => {
            setShowWizard(false);
            void loadDefinitions();
          }}
        />
      ) : editingId ? (
        <EntityDefinitionEditor
          definitionId={editingId}
          tenantId={tenantId}
          canUpdate={canUpdate}
          onCancel={() => setEditingId(null)}
          onSaved={() => {
            setEditingId(null);
            void loadDefinitions();
          }}
        />
      ) : (
        <EntityDefinitionList
          items={items}
          isLoading={isLoading}
          canCreate={canCreate}
          canUpdate={canUpdate}
          onCreate={() => setShowWizard(true)}
          onEdit={(id) => setEditingId(id)}
        />
      )}

      {!showWizard && !editingId && !isLoading && items.length > 0 ? (
        <Text className="text-muted-foreground text-sm">
          {t("dataModels.catalogHint")}
        </Text>
      ) : null}
    </div>
  );
}
