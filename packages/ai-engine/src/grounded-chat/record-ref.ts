/**
 * Re-export shared grounded-chat record link helpers from @repo/ai-context.
 * Kept here so existing `@repo/ai-engine/grounded-chat` imports continue to work.
 */
export {
  GROUNDED_CHAT_RECORD_HREF_PREFIX,
  GROUNDED_CHAT_RECORD_LINK_RE,
  GROUNDED_CHAT_BARE_ENTITY_ID_RE,
  formatGroundedChatRecordLink,
  parseGroundedChatRecordHref,
  extractGroundedChatRecordRefs,
  rewriteBareEntityIdsInAnswer,
  sanitizeGroundedChatRecordLinks,
  normalizeGroundedChatAnswerLinks,
  type GroundedChatRecordRef,
  type GroundedChatRecordCitationLike,
} from "@repo/ai-context/grounded-chat-record-ref";
