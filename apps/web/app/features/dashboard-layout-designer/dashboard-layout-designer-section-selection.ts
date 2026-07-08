export const DASHBOARD_LAYOUT_DESIGNER_SECTION_SEARCH_PARAM = "section";

export function getDashboardLayoutDesignerSectionId(
  searchParams: URLSearchParams,
): string {
  return (
    searchParams.get(DASHBOARD_LAYOUT_DESIGNER_SECTION_SEARCH_PARAM)?.trim() ??
    ""
  );
}

export function applySectionSelectionToSearchParams(
  searchParams: URLSearchParams,
  sectionId: string,
): URLSearchParams {
  const next = new URLSearchParams(searchParams);
  const trimmed = sectionId.trim();
  if (trimmed.length === 0) {
    next.delete(DASHBOARD_LAYOUT_DESIGNER_SECTION_SEARCH_PARAM);
  } else {
    next.set(DASHBOARD_LAYOUT_DESIGNER_SECTION_SEARCH_PARAM, trimmed);
  }
  return next;
}
