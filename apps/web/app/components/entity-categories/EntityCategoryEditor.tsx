import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Alert, Button, FieldLabel, Form, Input, Text, toast } from "@repo/ui";

import {
  createEntityCategory,
  isApiClientError,
  patchEntityCategory,
  type EntityCategoryRecord,
} from "../../lib/api-client";
import { resolveLucideIcon } from "../../lib/resolve-lucide-icon";

interface EntityCategoryEditorProps {
  readonly category: EntityCategoryRecord | null;
  readonly canCreate: boolean;
  readonly canUpdate: boolean;
  readonly onSaved: (category: EntityCategoryRecord) => void;
  readonly onCancel: () => void;
}

export function EntityCategoryEditor({
  category,
  canCreate,
  canUpdate,
  onSaved,
  onCancel,
}: EntityCategoryEditorProps) {
  const { t } = useTranslation("common");
  const isCreate = category === null;

  const [name, setName] = useState(category?.name ?? "");
  const [icon, setIcon] = useState(category?.icon ?? "Folder");
  const [order, setOrder] = useState(String(category?.order ?? 0));
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const PreviewIcon = resolveLucideIcon(icon);

  async function handleSave() {
    setValidationError(null);

    if (!name.trim()) {
      setValidationError(t("entityCategories.validation.nameRequired"));
      return;
    }
    if (!icon.trim()) {
      setValidationError(t("entityCategories.validation.iconRequired"));
      return;
    }

    const parsedOrder = Number(order);
    if (!Number.isInteger(parsedOrder)) {
      setValidationError(t("entityCategories.validation.orderRequired"));
      return;
    }

    setIsSaving(true);

    try {
      if (isCreate) {
        if (!canCreate) {
          throw new Error(t("entityCategories.forbiddenCreate"));
        }
        const created = await createEntityCategory({
          name: name.trim(),
          icon: icon.trim(),
          order: parsedOrder,
        });
        onSaved(created);
        return;
      }

      if (!canUpdate || !category) {
        throw new Error(t("entityCategories.forbiddenUpdate"));
      }

      const updated = await patchEntityCategory(category.id, {
        name: name.trim(),
        icon: icon.trim(),
        order: parsedOrder,
      });
      onSaved(updated);
    } catch (saveError) {
      const message = isApiClientError(saveError)
        ? saveError.message
        : saveError instanceof Error
          ? saveError.message
          : t("entityCategories.saveFailed");
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void handleSave();
      }}
    >
      {validationError ? <Alert>{validationError}</Alert> : null}

      <div>
        <FieldLabel htmlFor="category-name">
          {t("entityCategories.name")}
        </FieldLabel>
        <Input
          id="category-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>

      <div>
        <FieldLabel htmlFor="category-icon">
          {t("entityCategories.icon")}
        </FieldLabel>
        <div className="flex items-center gap-3">
          <Input
            id="category-icon"
            value={icon}
            onChange={(event) => setIcon(event.target.value)}
            placeholder="Folder"
          />
          <PreviewIcon className="size-5 shrink-0" aria-hidden />
        </div>
        <Text className="text-muted-foreground mt-1 text-sm">
          {t("entityCategories.iconHint")}
        </Text>
      </div>

      <div>
        <FieldLabel htmlFor="category-order">
          {t("entityCategories.order")}
        </FieldLabel>
        <Input
          id="category-order"
          type="number"
          value={order}
          onChange={(event) => setOrder(event.target.value)}
        />
        <Text className="text-muted-foreground mt-1 text-sm">
          {t("entityCategories.orderHint")}
        </Text>
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t("entityCategories.cancel")}
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? t("loading") : t("entityCategories.save")}
        </Button>
      </div>
    </Form>
  );
}
