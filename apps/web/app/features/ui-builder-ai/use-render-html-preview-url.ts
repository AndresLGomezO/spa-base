import { useEffect, useRef, useState } from "react";

import { prepareRenderHtmlPreview } from "./prepare-render-html-preview";

/**
 * Blob URL for isolated HTML preview. Hash fragment switches wizard steps without reloading the parent app.
 */
export function useRenderHtmlPreviewUrl(
  html: string | null | undefined,
): string | null {
  const blobUrlRef = useRef<string | null>(null);
  const htmlRef = useRef<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      htmlRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!html?.trim()) {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      htmlRef.current = null;
      setPreviewUrl(null);
      return;
    }

    if (htmlRef.current !== html) {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
      const blob = new Blob([prepareRenderHtmlPreview(html)], {
        type: "text/html;charset=utf-8",
      });
      blobUrlRef.current = URL.createObjectURL(blob);
      htmlRef.current = html;
    }

    setPreviewUrl(blobUrlRef.current);
  }, [html]);

  return previewUrl;
}
