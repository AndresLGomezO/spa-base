export type GlobalSearchHitSection =
  | "entities"
  | "features"
  | "views"
  /** Text query submitted to /search — used in recent only */
  | "queries";

export interface GlobalSearchHit {
  readonly id: string;
  readonly section: GlobalSearchHitSection;
  readonly label: string;
  readonly description?: string;
  /** Extra record detail for the results page (secondary searchable fields). */
  readonly snippet?: string;
  readonly to: string;
  readonly iconName?: string;
  readonly imageUrl?: string;
  /** Record hits only — catalog entity name for grouping/tabs */
  readonly entityName?: string;
}

export interface GlobalSearchRecentEntry extends GlobalSearchHit {
  readonly at: number;
}

export const GLOBAL_SEARCH_RECENT_MAX = 50;
/** How many recent entries the omnibar panel shows. */
export const GLOBAL_SEARCH_RECENT_VISIBLE = 3;

export const GLOBAL_SEARCH_SECTIONS = [
  "entities",
  "features",
  "views",
] as const satisfies readonly GlobalSearchHitSection[];

export type GlobalSearchCatalogSection =
  (typeof GLOBAL_SEARCH_SECTIONS)[number];

export const GLOBAL_SEARCH_RECORD_LIMIT = 8;
export const GLOBAL_SEARCH_RESULTS_RECORD_LIMIT = 40;
