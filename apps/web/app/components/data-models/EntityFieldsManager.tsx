import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button, Heading, TableCard } from "@repo/ui";

import type { FieldDefinitionInput } from "../../lib/api-client";

import { FieldDefinitionTable } from "./FieldDefinitionTable";
import { FieldEditorModal } from "./FieldEditorModal";
import type { PlanEntityIndexesInput } from "./plan-entity-indexes";

interface EntityFieldsManagerProps {
  readonly fields: readonly FieldDefinitionInput[];
  readonly entityName?: string;
  readonly onChange: (fields: FieldDefinitionInput[]) => void;
  readonly canEdit: boolean;
  readonly relationTargets: readonly {
    readonly name: string;
    readonly label: string;
  }[];
  readonly indexPlanInput?: PlanEntityIndexesInput;
}

type ModalState =
  | { readonly kind: "closed" }
  | { readonly kind: "add" }
  | { readonly kind: "edit"; readonly index: number };

export function EntityFieldsManager({
  fields,
  entityName,
  onChange,
  canEdit,
  relationTargets,
  indexPlanInput,
}: EntityFieldsManagerProps) {
  const { t } = useTranslation("common");
  const [modalState, setModalState] = useState<ModalState>({ kind: "closed" });

  const modalField = useMemo(() => {
    if (modalState.kind === "edit") {
      return fields[modalState.index] ?? null;
    }
    if (modalState.kind === "add") {
      return {
        name: "",
        type: "string" as const,
        required: true,
        ui: { order: fields.length },
      };
    }
    return null;
  }, [fields, modalState]);

  const orderDefault =
    modalState.kind === "edit" ? modalState.index : fields.length;

  function handleSaveField(field: FieldDefinitionInput) {
    if (modalState.kind === "add") {
      onChange([...fields, field]);
      return;
    }

    if (modalState.kind === "edit") {
      onChange(
        fields.map((entry, entryIndex) =>
          entryIndex === modalState.index ? field : entry,
        ),
      );
    }
  }

  function handleRemoveField() {
    if (modalState.kind !== "edit" || fields.length <= 1) {
      return;
    }

    onChange(fields.filter((_, entryIndex) => entryIndex !== modalState.index));
    setModalState({ kind: "closed" });
  }

  function handleDeleteField(index: number) {
    if (fields.length <= 1) {
      return;
    }
    onChange(fields.filter((_, entryIndex) => entryIndex !== index));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Heading level={3}>{t("dataModels.fieldsTitle")}</Heading>
        {canEdit ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => setModalState({ kind: "add" })}
          >
            {t("dataModels.addField")}
          </Button>
        ) : null}
      </div>

      <TableCard>
        <FieldDefinitionTable
          fields={fields}
          canEdit={canEdit}
          planInput={indexPlanInput}
          onEdit={(index) => setModalState({ kind: "edit", index })}
          onDelete={canEdit ? handleDeleteField : undefined}
        />
      </TableCard>

      {modalField && modalState.kind !== "closed" ? (
        <FieldEditorModal
          open
          mode={modalState.kind}
          field={modalField}
          entityName={entityName}
          orderDefault={orderDefault}
          relationTargets={relationTargets}
          canRemove={fields.length > 1}
          canEdit={canEdit}
          onSave={handleSaveField}
          onRemove={modalState.kind === "edit" ? handleRemoveField : undefined}
          onClose={() => setModalState({ kind: "closed" })}
        />
      ) : null}
    </div>
  );
}
