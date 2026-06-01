import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { toast } from "@repo/ui";

import {
  deleteEntityCategory,
  listEntityCategories,
  type EntityCategoryRecord,
} from "../../lib/api-client";
import { entityCategoriesQueryKey } from "../../hooks/useEntityNavCategories";
import { queryClient } from "../../query/query-client";
import { FormModal } from "../forms/FormModal";
import { EntityCategoryEditor } from "./EntityCategoryEditor";
import { EntityCategoryList } from "./EntityCategoryList";

interface EntityCategoryManagerProps {
  readonly tenantId: string;
  readonly canCreate?: boolean;
  readonly canUpdate?: boolean;
}

export function EntityCategoryManager({
  tenantId,
  canCreate = true,
  canUpdate = true,
}: EntityCategoryManagerProps) {
  const { t } = useTranslation("common");
  const [items, setItems] = useState<readonly EntityCategoryRecord[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const editingCategory =
    editingId === null
      ? null
      : (items.find((item) => item.id === editingId) ?? null);

  const loadCategories = useCallback(async () => {
    if (!tenantId) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const result = await listEntityCategories();
      setItems(
        [...result.items].sort((left, right) => left.order - right.order),
      );
    } catch (loadError) {
      toast.error(
        loadError instanceof Error
          ? loadError.message
          : t("entityCategories.loadFailed"),
      );
    } finally {
      setIsLoading(false);
    }
  }, [t, tenantId]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  function closeModal() {
    setIsCreating(false);
    setEditingId(null);
  }

  async function handleSaved(category: EntityCategoryRecord) {
    setItems((current) => {
      const index = current.findIndex((item) => item.id === category.id);
      const next =
        index === -1
          ? [...current, category]
          : current.map((item) => (item.id === category.id ? category : item));
      return [...next].sort((left, right) => left.order - right.order);
    });
    await queryClient.invalidateQueries({
      queryKey: entityCategoriesQueryKey,
    });
    closeModal();
  }

  async function handleDelete(id: string) {
    if (!canUpdate) {
      return;
    }

    const category = items.find((item) => item.id === id);
    if (
      !window.confirm(
        t("entityCategories.deleteConfirm", { name: category?.name ?? id }),
      )
    ) {
      return;
    }

    try {
      await deleteEntityCategory(id);
      setItems((current) => current.filter((item) => item.id !== id));
      await queryClient.invalidateQueries({
        queryKey: entityCategoriesQueryKey,
      });
      toast.success(t("entityCategories.deleted"));
    } catch (deleteError) {
      toast.error(
        deleteError instanceof Error
          ? deleteError.message
          : t("entityCategories.deleteFailed"),
      );
    }
  }

  const modalOpen = isCreating || editingId !== null;
  const modalTitle = useMemo(() => {
    if (isCreating) {
      return t("entityCategories.createTitle");
    }
    return t("entityCategories.editTitle", {
      name: editingCategory?.name ?? "",
    });
  }, [editingCategory?.name, isCreating, t]);

  return (
    <div className="flex min-h-full flex-col gap-6">
      <div className="flex min-h-0 flex-1 flex-col">
        <EntityCategoryList
          items={items}
          isLoading={isLoading}
          canCreate={canCreate}
          canUpdate={canUpdate}
          onCreate={() => setIsCreating(true)}
          onEdit={(id) => setEditingId(id)}
          onDelete={(id) => void handleDelete(id)}
        />
      </div>

      <FormModal open={modalOpen} title={modalTitle} onClose={closeModal}>
        <EntityCategoryEditor
          category={isCreating ? null : editingCategory}
          canCreate={canCreate}
          canUpdate={canUpdate}
          onSaved={(category) => void handleSaved(category)}
          onCancel={closeModal}
        />
      </FormModal>
    </div>
  );
}
