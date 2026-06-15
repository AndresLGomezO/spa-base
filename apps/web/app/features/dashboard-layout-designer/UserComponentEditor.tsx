import type {
  UserComponentConfig,
  UiComponentConfig,
} from "@repo/ui-builder-core";
import { MAX_CARD_IMAGE_SIZE_PX, MIN_CARD_IMAGE_SIZE_PX } from "@repo/ui";
import { FieldLabel, Input, Select } from "@repo/ui";
import { useTranslation } from "react-i18next";

interface UserComponentEditorProps {
  readonly config: UserComponentConfig;
  readonly onChange: (config: UiComponentConfig) => void;
}

export function UserComponentEditor({
  config,
  onChange,
}: UserComponentEditorProps) {
  const { t } = useTranslation("common");
  const showImageSize =
    config.display === "photo" || config.display === "photo-and-name";
  const showNameFormat =
    config.display === "name" || config.display === "photo-and-name";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <FieldLabel htmlFor="dashboard-user-display">
          {t("dashboardLayoutDesigner.userComponent.display")}
        </FieldLabel>
        <Select
          id="dashboard-user-display"
          className="border-input bg-background w-full rounded-md border px-2 py-1.5 text-sm"
          value={config.display}
          onChange={(event) => {
            const display = event.target
              .value as UserComponentConfig["display"];
            onChange({
              ...config,
              display,
              nameFormat:
                display === "name" || display === "photo-and-name"
                  ? config.nameFormat
                  : undefined,
            });
          }}
        >
          <option value="name">
            {t("dashboardLayoutDesigner.userComponent.displayName")}
          </option>
          <option value="email">
            {t("dashboardLayoutDesigner.userComponent.displayEmail")}
          </option>
          <option value="photo">
            {t("dashboardLayoutDesigner.userComponent.displayPhoto")}
          </option>
          <option value="photo-and-name">
            {t("dashboardLayoutDesigner.userComponent.displayPhotoAndName")}
          </option>
        </Select>
      </div>

      {showNameFormat ? (
        <div className="flex flex-col gap-2">
          <FieldLabel htmlFor="dashboard-user-name-format">
            {t("dashboardLayoutDesigner.userComponent.nameFormat")}
          </FieldLabel>
          <Select
            id="dashboard-user-name-format"
            className="border-input bg-background w-full rounded-md border px-2 py-1.5 text-sm"
            value={config.nameFormat ?? "full"}
            onChange={(event) =>
              onChange({
                ...config,
                nameFormat: event.target
                  .value as UserComponentConfig["nameFormat"],
              })
            }
          >
            <option value="full">
              {t("dashboardLayoutDesigner.userComponent.nameFormatFull")}
            </option>
            <option value="first">
              {t("dashboardLayoutDesigner.userComponent.nameFormatFirst")}
            </option>
          </Select>
        </div>
      ) : null}

      {showImageSize ? (
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">
            {t("dashboardLayoutDesigner.userComponent.imageSize")}
          </span>
          <Input
            type="number"
            min={MIN_CARD_IMAGE_SIZE_PX}
            max={MAX_CARD_IMAGE_SIZE_PX}
            value={config.imageSize ?? ""}
            placeholder="40"
            onChange={(event) => {
              const raw = event.target.value.trim();
              if (raw.length === 0) {
                onChange({ ...config, imageSize: undefined });
                return;
              }
              const parsed = Number.parseInt(raw, 10);
              if (!Number.isFinite(parsed)) {
                return;
              }
              onChange({ ...config, imageSize: parsed });
            }}
          />
        </label>
      ) : null}
    </div>
  );
}
