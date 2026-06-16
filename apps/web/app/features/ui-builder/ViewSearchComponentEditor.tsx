import type {
  UiComponentConfig,
  ViewSearchComponentConfig,
} from "@repo/ui-builder-core";
import { FieldLabel, Input } from "@repo/ui";
import { useTranslation } from "react-i18next";

interface ViewSearchComponentEditorProps {
  readonly config: ViewSearchComponentConfig;
  readonly onChange: (config: UiComponentConfig) => void;
}

export function ViewSearchComponentEditor({
  config,
  onChange,
}: ViewSearchComponentEditorProps) {
  const { t } = useTranslation("common");

  return (
    <div className="flex flex-col gap-3">
      <TextHint>{t("viewFilterComponents.searchGlobalHint")}</TextHint>
      <label className="flex flex-col gap-1">
        <FieldLabel>{t("viewFilterComponents.searchPlaceholder")}</FieldLabel>
        <Input
          value={config.placeholder ?? ""}
          onChange={(event) =>
            onChange({
              ...config,
              placeholder: event.target.value,
            })
          }
        />
      </label>
    </div>
  );
}

function TextHint({ children }: { readonly children: string }) {
  return <p className="text-muted-foreground text-sm">{children}</p>;
}
