import { useEffect } from "react";

/** Prevents wheel/trackpad scroll from chaining to the document in app shells. */
export function useLockDocumentScroll(): void {
  useEffect(() => {
    const { documentElement: html, body } = document;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";

    return () => {
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
    };
  }, []);
}
