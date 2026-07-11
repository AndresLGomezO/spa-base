import type { LabelConfig } from "@repo/ui-builder-core";
import { Input, Select } from "@repo/ui";

import { TEXT_COLOR_TOKEN_OPTIONS } from "./style-rules-state.js";

export interface LabelConfigEditorLabels {
  readonly showLabel: string;
  readonly label: string;
  readonly labelPosition: string;
  readonly labelAbove: string;
  readonly labelBelow: string;
  readonly labelLeft?: string;
  readonly labelRight?: string;
  readonly labelAlignLeft?: string;
  readonly labelAlignCenter?: string;
  readonly labelAlignRight?: string;
  readonly labelColor?: string;
}

export interface LabelConfigEditorProps {
  readonly label?: LabelConfig;
  readonly onChange: (label: LabelConfig | undefined) => void;
  readonly labels: LabelConfigEditorLabels;
}

export function LabelConfigEditor({
  label,
  onChange,
  labels,
}: LabelConfigEditorProps) {
  const show = label?.show ?? false;

  const updateLabel = (patch: Partial<LabelConfig>) => {
    onChange({
      show: label?.show ?? false,
      ...label,
      ...patch,
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={show}
          onChange={(event) => updateLabel({ show: event.target.checked })}
        />
        <span>{labels.showLabel}</span>
      </label>

      {show ? (
        <>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">{labels.label}</span>
            <Input
              value={label?.text ?? ""}
              onChange={(event) =>
                updateLabel({ show: true, text: event.target.value })
              }
              placeholder={labels.label}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">
              {labels.labelPosition}
            </span>
            <Select
              searchable
              value={label?.position ?? "above"}
              onChange={(event) =>
                updateLabel({
                  show: true,
                  position: event.target.value as NonNullable<
                    LabelConfig["position"]
                  >,
                })
              }
            >
              <option value="above">{labels.labelAbove}</option>
              <option value="below">{labels.labelBelow}</option>
              <option value="left">{labels.labelLeft ?? "Left"}</option>
              <option value="right">{labels.labelRight ?? "Right"}</option>
            </Select>
          </label>

          <div className="flex flex-wrap gap-3 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={label?.bold ?? false}
                onChange={(event) =>
                  updateLabel({ show: true, bold: event.target.checked })
                }
              />
              <span>Bold</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={label?.thin ?? false}
                onChange={(event) =>
                  updateLabel({ show: true, thin: event.target.checked })
                }
              />
              <span>Thin</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={label?.italic ?? false}
                onChange={(event) =>
                  updateLabel({ show: true, italic: event.target.checked })
                }
              />
              <span>Italic</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={label?.underline ?? false}
                onChange={(event) =>
                  updateLabel({ show: true, underline: event.target.checked })
                }
              />
              <span>Underline</span>
            </label>
          </div>

          {labels.labelColor ? (
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">{labels.labelColor}</span>
              <Select
                searchable
                value={label?.color ?? "default"}
                onChange={(event) =>
                  updateLabel({
                    show: true,
                    color: event.target.value as LabelConfig["color"],
                  })
                }
              >
                {TEXT_COLOR_TOKEN_OPTIONS.map((token) => (
                  <option key={token} value={token}>
                    {token}
                  </option>
                ))}
              </Select>
            </label>
          ) : null}

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Alignment</span>
            <Select
              searchable
              value={label?.align ?? "left"}
              onChange={(event) =>
                updateLabel({
                  show: true,
                  align: event.target.value as LabelConfig["align"],
                })
              }
            >
              <option value="left">{labels.labelAlignLeft ?? "Left"}</option>
              <option value="center">
                {labels.labelAlignCenter ?? "Center"}
              </option>
              <option value="right">{labels.labelAlignRight ?? "Right"}</option>
            </Select>
          </label>
        </>
      ) : null}
    </div>
  );
}
