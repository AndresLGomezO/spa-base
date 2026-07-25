/**
 * Standard grounded-chat record hit syntax (GFM link):
 *   [Préstamo Mami](record:financialItem/035ddce8-6251-479c-945c-6a0d484d8b17)
 *
 * Never emit bare `entityName:recordId` in user-facing prose.
 */

export const GROUNDED_CHAT_RECORD_HREF_PREFIX = "record:";

/** Matches [Label](record:entityName/recordId) */
export const GROUNDED_CHAT_RECORD_LINK_RE =
  /\[([^\]]+)\]\(record:([a-zA-Z][a-zA-Z0-9]*)\/([^)\s]+)\)/g;

/**
 * Nested / double-wrapped malformed links, e.g.
 * [Mastercard Black](record:[Mastercard Black](record:Mastercard Black))
 */
const GROUNDED_CHAT_NESTED_RECORD_LINK_RE =
  /\[([^\]]+)\]\(record:\[([^\]]+)\]\(record:([^)]+)\)\)/g;

/** Any [label](record:…) attempt, including invalid destinations. */
const GROUNDED_CHAT_ANY_RECORD_LINK_RE = /\[([^\]]+)\]\(record:([^)]*)\)/g;

/** Leftover bare record: fragments that are not already inside a ](record:…) link. */
const GROUNDED_CHAT_BARE_RECORD_FRAGMENT_RE =
  /(?<!\]\()record:(?:\[[^\]]*\]\([^)]*\)|[^\s)\][,;]+)/g;

/** Matches bare entityName:uuid / entityName/uuid that models sometimes dump in prose. */
export const GROUNDED_CHAT_BARE_ENTITY_ID_RE =
  /\b([a-zA-Z][a-zA-Z0-9]*)[:/]([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\b/g;

const VALID_ENTITY_ID_PATH_RE = /^([a-zA-Z][a-zA-Z0-9]*)\/([^\s/]+)$/;

export interface GroundedChatRecordRef {
  readonly entityName: string;
  readonly recordId: string;
  readonly label: string;
}

export type GroundedChatRecordCitationLike = {
  readonly entityName?: string;
  readonly recordId?: string;
  readonly label: string;
};

export function formatGroundedChatRecordLink(
  ref: GroundedChatRecordRef,
): string {
  const label = ref.label.trim() || ref.entityName;
  return `[${label}](record:${ref.entityName}/${ref.recordId})`;
}

export function parseGroundedChatRecordHref(
  href: string,
): Omit<GroundedChatRecordRef, "label"> | null {
  const trimmed = href.trim();
  if (!trimmed.startsWith(GROUNDED_CHAT_RECORD_HREF_PREFIX)) {
    return null;
  }
  const path = trimmed.slice(GROUNDED_CHAT_RECORD_HREF_PREFIX.length);
  return parseEntityIdPath(path);
}

function parseEntityIdPath(
  path: string,
): Omit<GroundedChatRecordRef, "label"> | null {
  const trimmed = path.trim();
  const match = VALID_ENTITY_ID_PATH_RE.exec(trimmed);
  if (!match) {
    return null;
  }
  const entityName = match[1]?.trim() ?? "";
  const recordId = match[2]?.trim() ?? "";
  if (
    !entityName ||
    !recordId ||
    /\s/.test(recordId) ||
    recordId.includes("[")
  ) {
    return null;
  }
  return { entityName, recordId };
}

export function extractGroundedChatRecordRefs(
  markdown: string,
): GroundedChatRecordRef[] {
  const out: GroundedChatRecordRef[] = [];
  const seen = new Set<string>();
  for (const match of markdown.matchAll(GROUNDED_CHAT_RECORD_LINK_RE)) {
    const label = match[1]?.trim() ?? "";
    const entityName = match[2]?.trim() ?? "";
    const recordId = match[3]?.trim() ?? "";
    if (!label || !entityName || !recordId) continue;
    const key = `${entityName}|${recordId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ entityName, recordId, label });
  }
  return out;
}

function buildCitationIndexes(
  citations: readonly GroundedChatRecordCitationLike[],
): {
  readonly labelByKey: Map<string, string>;
  readonly byLabel: Map<string, GroundedChatRecordRef>;
} {
  const labelByKey = new Map<string, string>();
  const byLabel = new Map<string, GroundedChatRecordRef>();

  for (const citation of citations) {
    const entityName = citation.entityName?.trim();
    const recordId = citation.recordId?.trim();
    if (!entityName || !recordId) continue;
    const label = citation.label.trim() || entityName;
    const ref: GroundedChatRecordRef = { entityName, recordId, label };
    labelByKey.set(`${entityName}|${recordId}`, label);
    const normalized = label.toLowerCase();
    if (!byLabel.has(normalized)) {
      byLabel.set(normalized, ref);
    }
  }

  return { labelByKey, byLabel };
}

function resolveCitationByLabel(
  byLabel: Map<string, GroundedChatRecordRef>,
  rawLabel: string,
): GroundedChatRecordRef | null {
  const label = rawLabel.trim();
  if (!label) return null;
  const exact = byLabel.get(label.toLowerCase());
  if (exact) return exact;

  let best: GroundedChatRecordRef | null = null;
  for (const [citationLabel, ref] of byLabel) {
    if (
      citationLabel.includes(label.toLowerCase()) ||
      label.toLowerCase().includes(citationLabel)
    ) {
      if (!best || citationLabel.length > best.label.length) {
        best = ref;
      }
    }
  }
  return best;
}

function resolveBrokenRecordDestination(
  destination: string,
  label: string,
  byLabel: Map<string, GroundedChatRecordRef>,
  labelByKey: Map<string, string>,
): string {
  const parsed = parseEntityIdPath(destination);
  if (parsed) {
    const citationLabel =
      labelByKey.get(`${parsed.entityName}|${parsed.recordId}`) ??
      label.trim() ??
      parsed.entityName;
    return formatGroundedChatRecordLink({
      entityName: parsed.entityName,
      recordId: parsed.recordId,
      label: citationLabel,
    });
  }

  const resolved =
    resolveCitationByLabel(byLabel, label) ??
    resolveCitationByLabel(byLabel, destination);
  if (resolved) {
    return formatGroundedChatRecordLink({
      ...resolved,
      label: label.trim() || resolved.label,
    });
  }

  return label.trim() || destination.trim();
}

/**
 * Rewrite bare entityName:uuid dumps into [@Label](record:…) using citation labels.
 * Removes raw UUID visibility from user-facing answers.
 */
export function rewriteBareEntityIdsInAnswer(
  answer: string,
  citations: readonly GroundedChatRecordCitationLike[],
): string {
  const { labelByKey } = buildCitationIndexes(citations);

  return answer.replace(
    GROUNDED_CHAT_BARE_ENTITY_ID_RE,
    (_full, entityName: string, recordId: string) => {
      const label = labelByKey.get(`${entityName}|${recordId}`) ?? entityName;
      return formatGroundedChatRecordLink({ entityName, recordId, label });
    },
  );
}

/**
 * Repair nested / label-as-href `record:` markdown into canonical hits, or
 * plain labels when no citation can resolve the link.
 */
export function sanitizeGroundedChatRecordLinks(
  answer: string,
  citations: readonly GroundedChatRecordCitationLike[] = [],
): string {
  const { labelByKey, byLabel } = buildCitationIndexes(citations);
  let text = answer;

  for (let pass = 0; pass < 6; pass += 1) {
    const next = text.replace(
      GROUNDED_CHAT_NESTED_RECORD_LINK_RE,
      (_full, outerLabel: string, innerLabel: string, innerDest: string) => {
        const label = (outerLabel.trim() || innerLabel.trim()).trim();
        return resolveBrokenRecordDestination(
          innerDest,
          label,
          byLabel,
          labelByKey,
        );
      },
    );
    if (next === text) break;
    text = next;
  }

  text = text.replace(
    GROUNDED_CHAT_ANY_RECORD_LINK_RE,
    (_full, label: string, destination: string) =>
      resolveBrokenRecordDestination(destination, label, byLabel, labelByKey),
  );

  text = text.replace(GROUNDED_CHAT_BARE_RECORD_FRAGMENT_RE, "");
  text = text.replace(/[ \t]{2,}/g, " ").replace(/ ?\n{3,}/g, "\n\n");
  return text.trimEnd();
}

/** Bare-id rewrite then malformed-link sanitize (orchestrator + client). */
export function normalizeGroundedChatAnswerLinks(
  answer: string,
  citations: readonly GroundedChatRecordCitationLike[] = [],
): string {
  return sanitizeGroundedChatRecordLinks(
    rewriteBareEntityIdsInAnswer(answer, citations),
    citations,
  );
}
