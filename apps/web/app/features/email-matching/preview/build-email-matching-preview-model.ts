import {
  splitLines,
  type ExtractorFormRow,
} from "../email-matching-draft.js";
import type {
  EmailMatchingPreviewBuildContext,
  EmailMatchingPreviewInput,
  EmailMatchingPreviewModel,
  EmailMatchingPreviewStep,
} from "./email-matching-preview-types.js";

function humanizePattern(
  pattern: string,
  context: EmailMatchingPreviewBuildContext,
): string {
  const trimmed = pattern.trim();
  if (trimmed.startsWith("/") && trimmed.lastIndexOf("/") > 0) {
    return context.t("emailMatchingWorkbench.preview.steps.patternRegex", {
      pattern: trimmed,
    });
  }
  return context.t("emailMatchingWorkbench.preview.steps.patternContains", {
    pattern: trimmed,
  });
}

function previewList(
  values: readonly string[],
  limit: number,
): readonly string[] {
  if (values.length <= limit) {
    return values;
  }
  return [...values.slice(0, limit)];
}

function buildTargetStep(
  input: EmailMatchingPreviewInput,
  context: EmailMatchingPreviewBuildContext,
): EmailMatchingPreviewStep {
  const entityLabel = context.entityLabel(input.entityName);
  const recordName = input.recordName?.trim() || null;
  const shortId =
    input.recordId.length > 12
      ? `${input.recordId.slice(0, 8)}…`
      : input.recordId;
  const summaryRecord = recordName ?? shortId;

  const bullets = [
    context.t("emailMatchingWorkbench.preview.steps.targetEntity", {
      entity: entityLabel,
    }),
  ];
  if (recordName) {
    bullets.push(
      context.t("emailMatchingWorkbench.preview.steps.targetRecordName", {
        name: recordName,
      }),
    );
  }
  bullets.push(
    context.t("emailMatchingWorkbench.preview.steps.targetRecord", {
      record: input.recordId,
    }),
  );

  const detailBullets = [
    context.t("emailMatchingWorkbench.preview.steps.targetEntity", {
      entity: `${entityLabel} (${input.entityName})`,
    }),
  ];
  if (recordName) {
    detailBullets.push(
      context.t("emailMatchingWorkbench.preview.steps.targetRecordName", {
        name: recordName,
      }),
    );
  }
  detailBullets.push(
    context.t("emailMatchingWorkbench.preview.steps.targetRecord", {
      record: input.recordId,
    }),
    input.draft.enabled
      ? context.t("emailMatchingWorkbench.list.statusEnabled")
      : context.t("emailMatchingWorkbench.list.statusDisabled"),
  );

  return {
    id: "target",
    kind: "target",
    icon: "target",
    title: context.t("emailMatchingWorkbench.preview.steps.target"),
    summary: context.t("emailMatchingWorkbench.preview.steps.targetSummary", {
      entity: entityLabel,
      record: summaryRecord,
    }),
    bullets,
    details: [
      {
        title: context.t("emailMatchingWorkbench.preview.details.target"),
        bullets: detailBullets,
      },
    ],
  };
}

function buildSendersStep(
  input: EmailMatchingPreviewInput,
  context: EmailMatchingPreviewBuildContext,
): EmailMatchingPreviewStep {
  const senders = splitLines(input.draft.fromAddresses);
  if (senders.length === 0) {
    return {
      id: "senders",
      kind: "senders",
      icon: "senders",
      title: context.t("emailMatchingWorkbench.preview.steps.senders"),
      summary: context.t("emailMatchingWorkbench.preview.steps.sendersEmpty"),
    };
  }

  const overview = previewList(senders, 3).map((address) =>
    context.t("emailMatchingWorkbench.preview.steps.senderBullet", {
      address,
    }),
  );
  if (senders.length > 3) {
    overview.push(
      context.t("emailMatchingWorkbench.preview.steps.moreCount", {
        count: senders.length - 3,
      }),
    );
  }

  return {
    id: "senders",
    kind: "senders",
    icon: "senders",
    title: context.t("emailMatchingWorkbench.preview.steps.senders"),
    summary: context.t("emailMatchingWorkbench.preview.steps.sendersSummary", {
      count: senders.length,
    }),
    bullets: overview,
    details: [
      {
        title: context.t("emailMatchingWorkbench.preview.details.senders"),
        bullets: senders,
      },
    ],
  };
}

function buildPatternStep(options: {
  readonly id: "subject" | "body";
  readonly icon: "subject" | "body";
  readonly titleKey: string;
  readonly emptyKey: string;
  readonly summaryKey: string;
  readonly detailsTitleKey: string;
  readonly patterns: readonly string[];
  readonly context: EmailMatchingPreviewBuildContext;
}): EmailMatchingPreviewStep {
  const { patterns, context } = options;
  if (patterns.length === 0) {
    return {
      id: options.id,
      kind: options.id,
      icon: options.icon,
      title: context.t(options.titleKey),
      summary: context.t(options.emptyKey),
    };
  }

  const overview = previewList(patterns, 3).map((pattern) =>
    humanizePattern(pattern, context),
  );
  if (patterns.length > 3) {
    overview.push(
      context.t("emailMatchingWorkbench.preview.steps.moreCount", {
        count: patterns.length - 3,
      }),
    );
  }

  return {
    id: options.id,
    kind: options.id,
    icon: options.icon,
    title: context.t(options.titleKey),
    summary: context.t(options.summaryKey, { count: patterns.length }),
    bullets: overview,
    details: [
      {
        title: context.t(options.detailsTitleKey),
        bullets: patterns.map((pattern) => humanizePattern(pattern, context)),
      },
    ],
  };
}

function formatExtractorBullet(
  row: ExtractorFormRow,
  context: EmailMatchingPreviewBuildContext,
  advanced: boolean,
): string | null {
  const field = row.field.trim();
  if (!field) {
    return null;
  }
  if (row.transform === "literal") {
    const literal = row.literal.trim() || "?";
    return advanced
      ? context.t("emailMatchingWorkbench.preview.steps.extractorLiteralAdvanced", {
          field,
          literal,
          sufficient: row.sufficientForRelevance
            ? context.t("emailMatchingWorkbench.settings.yes")
            : context.t("emailMatchingWorkbench.settings.no"),
        })
      : context.t("emailMatchingWorkbench.preview.steps.extractorLiteral", {
          field,
          literal,
        });
  }

  const source =
    row.sourceMode === "pattern" && row.pattern.trim()
      ? humanizePattern(row.pattern, context)
      : row.label.trim()
        ? context.t("emailMatchingWorkbench.preview.steps.extractorLabelSource", {
            label: row.label.trim(),
          })
        : row.sourceMode === "pattern"
          ? context.t("emailMatchingWorkbench.preview.steps.patternContains", {
              pattern: "?",
            })
          : context.t("emailMatchingWorkbench.preview.steps.extractorLabelSource", {
              label: "?",
            });

  if (advanced) {
    return context.t(
      "emailMatchingWorkbench.preview.steps.extractorAdvanced",
      {
        field,
        source,
        transform: row.transform,
        capture:
          row.sourceMode === "pattern"
            ? row.captureGroup.trim() || "1"
            : "—",
        sufficient: row.sufficientForRelevance
          ? context.t("emailMatchingWorkbench.settings.yes")
          : context.t("emailMatchingWorkbench.settings.no"),
      },
    );
  }

  return context.t("emailMatchingWorkbench.preview.steps.extractorBullet", {
    field,
    source,
    transform: row.transform,
  });
}

function buildExtractorsStep(
  input: EmailMatchingPreviewInput,
  context: EmailMatchingPreviewBuildContext,
): EmailMatchingPreviewStep {
  const rows = input.draft.bodyFieldExtractors.filter(
    (row) => row.field.trim().length > 0,
  );
  if (rows.length === 0) {
    return {
      id: "extractors",
      kind: "extractors",
      icon: "extractors",
      title: context.t("emailMatchingWorkbench.preview.steps.extractors"),
      summary: context.t(
        "emailMatchingWorkbench.preview.steps.extractorsEmpty",
      ),
    };
  }

  const fieldNames = rows.map((row) => row.field.trim()).filter(Boolean);
  const bullets = rows
    .map((row) => formatExtractorBullet(row, context, false))
    .filter((line): line is string => line != null);
  const advancedBullets = rows
    .map((row) => formatExtractorBullet(row, context, true))
    .filter((line): line is string => line != null);

  return {
    id: "extractors",
    kind: "extractors",
    icon: "extractors",
    title: context.t("emailMatchingWorkbench.preview.steps.extractors"),
    summary: context.t(
      "emailMatchingWorkbench.preview.steps.extractorsSummary",
      {
        fields: fieldNames.slice(0, 4).join(", "),
        count: fieldNames.length,
      },
    ),
    bullets: previewList(bullets, 4),
    details: [
      {
        title: context.t("emailMatchingWorkbench.preview.details.extractors"),
        bullets,
      },
      {
        title: context.t(
          "emailMatchingWorkbench.preview.details.extractorsAdvanced",
        ),
        bullets: advancedBullets,
      },
    ],
  };
}

function buildIngestStep(
  input: EmailMatchingPreviewInput,
  context: EmailMatchingPreviewBuildContext,
): EmailMatchingPreviewStep {
  const draft = input.draft;
  const modeLabel =
    draft.ingestMode === "link"
      ? context.t("emailMatchingWorkbench.list.ingestLink")
      : context.t("emailMatchingWorkbench.list.ingestCreate");
  const aiLabel = draft.useAi
    ? context.t("emailMatchingWorkbench.list.useAiOn")
    : context.t("emailMatchingWorkbench.list.useAiOff");

  const bullets = [
    context.t("emailMatchingWorkbench.preview.steps.ingestModeBullet", {
      mode: modeLabel,
      order: draft.order,
    }),
    context.t("emailMatchingWorkbench.preview.steps.ingestAiBullet", {
      ai: aiLabel,
    }),
  ];
  if (draft.catchupNeeded) {
    bullets.push(
      context.t("emailMatchingWorkbench.preview.steps.ingestCatchup"),
    );
  }
  if (draft.attachmentImport?.enabled) {
    bullets.push(
      context.t("emailMatchingWorkbench.preview.steps.ingestAttachments", {
        documentType: draft.attachmentImport.documentType || "?",
      }),
    );
  }

  const detailBullets = [...bullets];
  if (draft.aiInstructions.trim()) {
    detailBullets.push(
      context.t("emailMatchingWorkbench.preview.details.aiInstructions", {
        instructions: draft.aiInstructions.trim(),
      }),
    );
  }
  if (draft.gmailQueryExtra.trim()) {
    detailBullets.push(
      context.t("emailMatchingWorkbench.preview.details.gmailQueryExtra", {
        query: draft.gmailQueryExtra.trim(),
      }),
    );
  }
  if (draft.attachmentImport?.enabled) {
    detailBullets.push(
      context.t("emailMatchingWorkbench.preview.details.attachmentFields", {
        documentType: draft.attachmentImport.documentType || "—",
        documentDateField: draft.attachmentImport.documentDateField || "—",
        recordIdField: draft.attachmentImport.recordIdField || "—",
      }),
    );
  }

  return {
    id: "ingest",
    kind: "ingest",
    icon: "ingest",
    title: context.t("emailMatchingWorkbench.preview.steps.ingest"),
    summary: context.t("emailMatchingWorkbench.preview.steps.ingestSummary", {
      mode: modeLabel,
      ai: aiLabel,
    }),
    bullets,
    details: [
      {
        title: context.t("emailMatchingWorkbench.preview.details.ingest"),
        bullets: detailBullets,
      },
    ],
  };
}

function buildMetaChips(
  input: EmailMatchingPreviewInput,
  context: EmailMatchingPreviewBuildContext,
): readonly string[] {
  const draft = input.draft;
  const chips = [
    draft.enabled
      ? context.t("emailMatchingWorkbench.list.statusEnabled")
      : context.t("emailMatchingWorkbench.list.statusDisabled"),
    draft.ingestMode === "link"
      ? context.t("emailMatchingWorkbench.list.ingestLink")
      : context.t("emailMatchingWorkbench.list.ingestCreate"),
    draft.useAi
      ? context.t("emailMatchingWorkbench.list.useAiOn")
      : context.t("emailMatchingWorkbench.list.useAiOff"),
    context.entityLabel(input.entityName),
  ];
  const extractorCount = draft.bodyFieldExtractors.filter((row) =>
    row.field.trim(),
  ).length;
  if (extractorCount > 0) {
    chips.push(
      context.t("emailMatchingWorkbench.preview.steps.extractorChip", {
        count: extractorCount,
      }),
    );
  }
  return chips;
}

export function buildEmailMatchingPreviewModel(
  input: EmailMatchingPreviewInput,
  context: EmailMatchingPreviewBuildContext,
): EmailMatchingPreviewModel {
  return {
    name: input.name,
    description: input.description,
    steps: [
      buildTargetStep(input, context),
      buildSendersStep(input, context),
      buildPatternStep({
        id: "subject",
        icon: "subject",
        titleKey: "emailMatchingWorkbench.preview.steps.subject",
        emptyKey: "emailMatchingWorkbench.preview.steps.subjectEmpty",
        summaryKey: "emailMatchingWorkbench.preview.steps.subjectSummary",
        detailsTitleKey: "emailMatchingWorkbench.preview.details.subject",
        patterns: splitLines(input.draft.subjectPatterns),
        context,
      }),
      buildPatternStep({
        id: "body",
        icon: "body",
        titleKey: "emailMatchingWorkbench.preview.steps.body",
        emptyKey: "emailMatchingWorkbench.preview.steps.bodyEmpty",
        summaryKey: "emailMatchingWorkbench.preview.steps.bodySummary",
        detailsTitleKey: "emailMatchingWorkbench.preview.details.body",
        patterns: splitLines(input.draft.bodyPatterns),
        context,
      }),
      buildExtractorsStep(input, context),
      buildIngestStep(input, context),
    ],
    metaChips: buildMetaChips(input, context),
  };
}
