function resolvePreviewDocumentBaseUrl(win: Window): string | null {
  const baseUrl = win.location.href.split("#")[0] ?? "";
  if (baseUrl === "about:blank" || !baseUrl.startsWith("blob:")) {
    return null;
  }
  return baseUrl;
}

/** Reset scroll position after step changes so navigation stays at the top. */
export function scrollRenderHtmlPreviewToTop(iframe: HTMLIFrameElement): void {
  const win = iframe.contentWindow;
  if (!win) {
    return;
  }
  win.scrollTo(0, 0);
  iframe.contentDocument?.documentElement?.scrollTo(0, 0);
  iframe.contentDocument?.body?.scrollTo(0, 0);
}

export function isRenderHtmlPreviewDocumentReady(
  iframe: HTMLIFrameElement,
): boolean {
  const win = iframe.contentWindow;
  if (!win) {
    return false;
  }
  return resolvePreviewDocumentBaseUrl(win) !== null;
}

/** Toggle wizard step panels directly — :target is unreliable with replaceState on blob URLs. */
export function applyRenderHtmlPreviewStepPanels(
  doc: Document,
  stepId: string | null | undefined,
): string | null {
  const panels = Array.from(doc.querySelectorAll<HTMLElement>(".step-panel"));
  if (panels.length === 0) {
    return null;
  }

  const resolvedStepId =
    stepId && panels.some((panel) => panel.id === stepId)
      ? stepId
      : (panels[0]?.id ?? null);

  for (const panel of panels) {
    panel.style.display = panel.id === resolvedStepId ? "block" : "none";
  }

  if (resolvedStepId) {
    for (const link of doc.querySelectorAll<HTMLAnchorElement>(
      'a[href^="#"]',
    )) {
      const href = link.getAttribute("href");
      if (!href?.startsWith("#")) {
        continue;
      }
      const linkStepId = decodeURIComponent(href.slice(1));
      link.classList.toggle("active", linkStepId === resolvedStepId);
    }
  }

  return resolvedStepId;
}

export function applyRenderHtmlPreviewStep(
  iframe: HTMLIFrameElement,
  stepId: string | null | undefined,
): string | null {
  const doc = iframe.contentDocument;
  if (!doc || !isRenderHtmlPreviewDocumentReady(iframe)) {
    return null;
  }

  const resolvedStepId = applyRenderHtmlPreviewStepPanels(doc, stepId);
  if (resolvedStepId === null) {
    return null;
  }

  scrollRenderHtmlPreviewToTop(iframe);
  return resolvedStepId;
}

export function bindRenderHtmlPreviewStepNavigation(
  iframe: HTMLIFrameElement,
  onStepChange: (stepId: string) => void,
): () => void {
  const doc = iframe.contentDocument;
  if (!doc) {
    return () => undefined;
  }

  const onClick = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const link = target.closest('a[href^="#"]');
    if (!(link instanceof HTMLAnchorElement)) {
      return;
    }

    const href = link.getAttribute("href");
    if (!href || href === "#") {
      return;
    }

    event.preventDefault();
    const stepId = decodeURIComponent(href.slice(1));
    const resolvedStepId = applyRenderHtmlPreviewStep(iframe, stepId);
    if (resolvedStepId) {
      onStepChange(resolvedStepId);
    }
  };

  doc.addEventListener("click", onClick, true);
  return () => {
    doc.removeEventListener("click", onClick, true);
  };
}
