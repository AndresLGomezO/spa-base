import type {
  FormulaPreviewBuildContext,
  FormulaPreviewInput,
  FormulaPreviewModel,
  FormulaPreviewStep,
} from "./formula-preview-types.js";

function expressionKindLabel(
  body: { readonly kind?: string },
  context: FormulaPreviewBuildContext,
): string {
  const kind = body.kind?.trim() || "expression";
  return context.t("formulas.preview.steps.expressionKind", { kind });
}

function buildPurposeStep(
  input: FormulaPreviewInput,
  context: FormulaPreviewBuildContext,
): FormulaPreviewStep {
  return {
    id: "purpose",
    kind: "purpose",
    icon: "purpose",
    title: context.t("formulas.preview.steps.purpose"),
    summary: input.summaryText,
    bullets: input.detailBullets.length > 0 ? input.detailBullets : undefined,
    details:
      input.detailBullets.length > 0
        ? [
            {
              title: context.t("formulas.preview.details.howItBehaves"),
              bullets: input.detailBullets,
            },
          ]
        : undefined,
  };
}

function buildInputsStep(
  input: FormulaPreviewInput,
  context: FormulaPreviewBuildContext,
): FormulaPreviewStep {
  const { definition, exampleInputs } = input;
  if (definition.inputs.length === 0) {
    return {
      id: "inputs",
      kind: "inputs",
      icon: "inputs",
      title: context.t("formulas.preview.steps.inputs"),
      summary: context.t("formulas.summaryModal.noInputs"),
    };
  }

  const bullets = definition.inputs.map((entry) => {
    const required = entry.required
      ? context.t("formulas.summaryModal.required")
      : context.t("formulas.summaryModal.optional");
    return context.t("formulas.preview.steps.inputBullet", {
      name: entry.name,
      required,
    });
  });

  const detailBullets = definition.inputs.map((entry) => {
    const example = exampleInputs[entry.name];
    const exampleText =
      example === undefined || example === null
        ? "—"
        : typeof example === "string"
          ? example
          : JSON.stringify(example);
    const description = entry.description?.trim();
    return description
      ? context.t("formulas.preview.details.inputWithDescription", {
          name: entry.name,
          description,
          example: exampleText,
        })
      : context.t("formulas.preview.details.inputExample", {
          name: entry.name,
          example: exampleText,
        });
  });

  return {
    id: "inputs",
    kind: "inputs",
    icon: "inputs",
    title: context.t("formulas.preview.steps.inputs"),
    summary: context.t("formulas.preview.steps.inputsSummary", {
      count: definition.inputs.length,
    }),
    bullets,
    details: [
      {
        title: context.t("formulas.preview.details.exampleInputs"),
        bullets: detailBullets,
      },
    ],
  };
}

function buildOutputStep(
  input: FormulaPreviewInput,
  context: FormulaPreviewBuildContext,
): FormulaPreviewStep {
  if (input.exampleOutput) {
    return {
      id: "output",
      kind: "output",
      icon: "output",
      title: context.t("formulas.preview.steps.output"),
      summary: context.t("formulas.preview.steps.outputReady"),
      bullets: [
        context.t("formulas.preview.steps.outputBullet", {
          value:
            input.exampleOutput.length > 80
              ? `${input.exampleOutput.slice(0, 77)}…`
              : input.exampleOutput,
        }),
      ],
      details: [
        {
          title: context.t("formulas.preview.details.exampleOutput"),
          bullets: [input.exampleOutput],
        },
      ],
    };
  }

  return {
    id: "output",
    kind: "output",
    icon: "output",
    title: context.t("formulas.preview.steps.output"),
    summary:
      input.exampleOutputError ??
      context.t("formulas.summaryModal.outputUnavailable"),
  };
}

function buildExpressionStep(
  input: FormulaPreviewInput,
  context: FormulaPreviewBuildContext,
): FormulaPreviewStep {
  return {
    id: "expression",
    kind: "expression",
    icon: "expression",
    title: context.t("formulas.preview.steps.expression"),
    summary: expressionKindLabel(input.definition.body, context),
    bullets: [context.t("formulas.preview.steps.expressionHint")],
  };
}

function buildMetaChips(
  input: FormulaPreviewInput,
  context: FormulaPreviewBuildContext,
): readonly string[] {
  return [
    input.definition.source === "platform"
      ? context.t("formulas.summaryModal.sourcePlatform")
      : context.t("formulas.summaryModal.sourceTenant"),
    input.definition.enabled
      ? context.t("formulas.settings.enabled")
      : context.t("formulas.settings.disabled"),
  ];
}

export function buildFormulaPreviewModel(
  input: FormulaPreviewInput,
  context: FormulaPreviewBuildContext,
): FormulaPreviewModel {
  return {
    name: input.definition.name,
    description: input.definition.description,
    steps: [
      buildPurposeStep(input, context),
      buildInputsStep(input, context),
      buildOutputStep(input, context),
      buildExpressionStep(input, context),
    ],
    metaChips: buildMetaChips(input, context),
    body: input.definition.body,
  };
}
