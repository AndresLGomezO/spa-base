import { useTranslation } from "react-i18next";

import { Button, Checkbox, FieldLabel, Input, Text } from "@repo/ui";

import type { FieldDefinitionInput } from "../../lib/api-client";

const FIELD_TYPES: readonly FieldDefinitionInput["type"][] = [
  "string",
  "number",
  "boolean",
  "date",
  "enum",
  "relation",
];

interface FieldEditorProps {
  readonly field: FieldDefinitionInput;
  readonly index: number;
  readonly relationTargets: readonly {
    readonly name: string;
    readonly label: string;
  }[];
  readonly onChange: (index: number, field: FieldDefinitionInput) => void;
  readonly onRemove: (index: number) => void;
  readonly canRemove: boolean;
}

export function FieldEditor({
  field,
  index,
  relationTargets,
  onChange,
  onRemove,
  canRemove,
}: FieldEditorProps) {
  const { t } = useTranslation("common");

  function update(partial: Partial<FieldDefinitionInput>) {
    onChange(index, { ...field, ...partial });
  }

  return (
    <div className="border-border space-y-3 rounded-md border p-4">
      <div className="flex items-center justify-between gap-2">
        <Text className="font-medium">
          {t("dataModels.fieldNumber", { number: index + 1 })}
        </Text>
        {canRemove ? (
          <Button type="button" variant="ghost" onClick={() => onRemove(index)}>
            {t("dataModels.removeField")}
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <FieldLabel htmlFor={`field-name-${index}`}>
            {t("dataModels.fieldName")}
          </FieldLabel>
          <Input
            id={`field-name-${index}`}
            value={field.name}
            onChange={(event) => update({ name: event.target.value })}
            placeholder="amount"
          />
        </div>
        <div>
          <FieldLabel htmlFor={`field-type-${index}`}>
            {t("dataModels.fieldType")}
          </FieldLabel>
          <select
            id={`field-type-${index}`}
            className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
            value={field.type}
            onChange={(event) => {
              const type = event.target.value as FieldDefinitionInput["type"];
              update({
                type,
                relation: type === "relation" ? field.relation : undefined,
                enumValues:
                  type === "enum" ? (field.enumValues ?? [""]) : undefined,
              });
            }}
          >
            {FIELD_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`dataModels.fieldTypes.${type}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Checkbox
        id={`field-required-${index}`}
        label={t("dataModels.required")}
        checked={field.required ?? false}
        onChange={(event) => update({ required: event.target.checked })}
      />

      {field.type === "enum" ? (
        <div className="space-y-2">
          <FieldLabel>{t("dataModels.enumValues")}</FieldLabel>
          {(field.enumValues ?? [""]).map((value, enumIndex) => (
            <div key={enumIndex} className="flex gap-2">
              <Input
                value={value}
                onChange={(event) => {
                  const next = [...(field.enumValues ?? [""])];
                  next[enumIndex] = event.target.value;
                  update({ enumValues: next });
                }}
                placeholder={t("dataModels.enumPlaceholder")}
              />
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  const next = [...(field.enumValues ?? [""])];
                  next.splice(enumIndex, 1);
                  update({ enumValues: next.length > 0 ? next : [""] });
                }}
              >
                {t("dataModels.removeValue")}
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              update({ enumValues: [...(field.enumValues ?? [""]), ""] })
            }
          >
            {t("dataModels.addEnumValue")}
          </Button>
        </div>
      ) : null}

      {field.type === "relation" ? (
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <FieldLabel htmlFor={`field-relation-target-${index}`}>
              {t("dataModels.relationTarget")}
            </FieldLabel>
            <select
              id={`field-relation-target-${index}`}
              className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
              value={field.relation?.target ?? ""}
              onChange={(event) =>
                update({
                  relation: {
                    target: event.target.value,
                    type: field.relation?.type ?? "many-to-one",
                  },
                })
              }
            >
              <option value="">{t("dataModels.selectTarget")}</option>
              {relationTargets.map((target) => (
                <option key={target.name} value={target.name}>
                  {target.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel htmlFor={`field-relation-type-${index}`}>
              {t("dataModels.relationType")}
            </FieldLabel>
            <select
              id={`field-relation-type-${index}`}
              className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
              value={field.relation?.type ?? "many-to-one"}
              onChange={(event) =>
                update({
                  relation: {
                    target: field.relation?.target ?? "",
                    type: event.target.value as NonNullable<
                      FieldDefinitionInput["relation"]
                    >["type"],
                  },
                })
              }
            >
              <option value="one-to-one">one-to-one</option>
              <option value="one-to-many">one-to-many</option>
              <option value="many-to-one">many-to-one</option>
              <option value="many-to-many">many-to-many</option>
            </select>
          </div>
        </div>
      ) : null}
    </div>
  );
}
