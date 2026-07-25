import type { AiSpendBlockReason } from "./limits.js";

export class AiSpendLimitError extends Error {
  readonly code = "ai.spend_limit" as const;
  readonly scope: AiSpendBlockReason["scope"];
  readonly meter: AiSpendBlockReason["meter"];
  readonly limit: number;
  readonly used: number;

  constructor(reason: AiSpendBlockReason) {
    super(
      `AI spend limit reached (${reason.scope}.${reason.meter}: ${reason.used}/${reason.limit}).`,
    );
    this.name = "AiSpendLimitError";
    this.scope = reason.scope;
    this.meter = reason.meter;
    this.limit = reason.limit;
    this.used = reason.used;
  }

  toJSON() {
    return {
      code: this.code,
      scope: this.scope,
      meter: this.meter,
      limit: this.limit,
      used: this.used,
      message: this.message,
    };
  }
}
