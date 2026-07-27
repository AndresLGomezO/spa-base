import type { AiChatComponentConfig } from "@repo/ui-builder-core";
import {
  filterComponentInnerStyleRules,
  resolveMetricKpiPresentation,
} from "@repo/ui-builder-core";
import { CardFieldValue } from "@repo/ui";
import { ResponsiveStyleTag } from "@repo/ui-builder-renderer";
import { cn } from "@repo/theme/utils";

import { AiChatFooterButton } from "../../features/ai-chat/AiChatFooterButton";

function labelAlignClassName(
  align?: "left" | "center" | "right",
): string | undefined {
  if (align === "center") {
    return "text-center";
  }
  if (align === "right") {
    return "text-right";
  }
  return undefined;
}

interface LayoutAiChatButtonProps {
  readonly config: AiChatComponentConfig;
}

export function LayoutAiChatButton({ config }: LayoutAiChatButtonProps) {
  const innerStyles = filterComponentInnerStyleRules(config.styles);
  const presentation = resolveMetricKpiPresentation(innerStyles);
  const labelText = config.label?.text?.trim();
  const showCaption = config.label?.show === true && Boolean(labelText);

  const button = (
    <>
      <ResponsiveStyleTag cssText={presentation.cssText} />
      <AiChatFooterButton
        config={config}
        className={presentation.valueClassName}
      />
    </>
  );

  if (!showCaption) {
    return (
      <div
        className={cn(
          "w-fit max-w-full shrink-0 overflow-visible",
          presentation.className,
        )}
        style={presentation.style}
        data-testid="layout-ai-chat-button"
      >
        {button}
      </div>
    );
  }

  return (
    <div
      className="w-fit max-w-full shrink-0 overflow-visible"
      data-testid="layout-ai-chat-button"
    >
      <CardFieldValue
        label={labelText}
        showLabel={showCaption}
        labelPosition={config.label?.position ?? "above"}
        labelUppercase={false}
        value={button}
        allowEmpty
        className={cn(
          "w-fit max-w-full shrink-0 overflow-visible",
          presentation.className,
        )}
        style={presentation.style}
        labelClassName={labelAlignClassName(config.label?.align)}
        valueClassName={presentation.valueClassName}
        valueStyle={presentation.valueStyle}
        textSize={presentation.textSize}
        textBold={config.label?.bold}
        textThin={config.label?.thin}
        textItalic={config.label?.italic}
        textUnderline={config.label?.underline}
        textColor={config.label?.color}
      />
    </div>
  );
}
