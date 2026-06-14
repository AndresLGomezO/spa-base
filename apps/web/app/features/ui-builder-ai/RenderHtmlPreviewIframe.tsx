import { useEffect, useRef } from "react";

import { RENDER_HTML_PREVIEW_SANDBOX } from "./prepare-render-html-preview";
import {
  applyRenderHtmlPreviewStep,
  bindRenderHtmlPreviewStepNavigation,
  isRenderHtmlPreviewDocumentReady,
} from "./render-html-preview-step";
import { useRenderHtmlPreviewUrl } from "./use-render-html-preview-url";

interface RenderHtmlPreviewIframeProps {
  readonly html: string | null | undefined;
  readonly hashStepId?: string | null;
  readonly title: string;
  readonly className?: string;
  readonly onHashStepIdChange?: (stepId: string) => void;
}

export function RenderHtmlPreviewIframe({
  html,
  hashStepId,
  title,
  className,
  onHashStepIdChange,
}: RenderHtmlPreviewIframeProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const onStepChangeRef = useRef(onHashStepIdChange);
  onStepChangeRef.current = onHashStepIdChange;
  const previewUrl = useRenderHtmlPreviewUrl(html);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !previewUrl) {
      return;
    }

    let removeNavigationListener: (() => void) | undefined;
    let navigationBound = false;

    const bindPreview = () => {
      if (!isRenderHtmlPreviewDocumentReady(iframe)) {
        return;
      }

      applyRenderHtmlPreviewStep(iframe, hashStepId);

      if (!navigationBound) {
        removeNavigationListener = bindRenderHtmlPreviewStepNavigation(
          iframe,
          (stepId) => {
            onStepChangeRef.current?.(stepId);
          },
        );
        navigationBound = true;
      }
    };

    const onLoad = () => {
      navigationBound = false;
      removeNavigationListener?.();
      removeNavigationListener = undefined;
      bindPreview();
    };

    iframe.addEventListener("load", onLoad);
    bindPreview();

    return () => {
      iframe.removeEventListener("load", onLoad);
      removeNavigationListener?.();
    };
  }, [previewUrl, hashStepId]);

  if (!previewUrl) {
    return null;
  }

  return (
    <iframe
      ref={iframeRef}
      title={title}
      sandbox={RENDER_HTML_PREVIEW_SANDBOX}
      src={previewUrl}
      className={className}
    />
  );
}
