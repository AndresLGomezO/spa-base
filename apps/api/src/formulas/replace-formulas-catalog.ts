import {
  computeFormulaCatalogReplacePlan,
  validateFormulaCatalog,
  type CreateFormulaDefinitionInput,
  type FormulaDefinition,
  type FormulaDefinitionsCatalogEnvelope,
  type PatchFormulaDefinitionInput,
} from "@repo/formula-definitions";

import type { FormulaRuntimeContext } from "./formula-runtime-context.js";

export class FormulaCatalogReplaceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FormulaCatalogReplaceError";
  }
}

interface ReplaceFormulasCatalogResult {
  readonly counts: {
    readonly created: number;
    readonly updated: number;
    readonly deleted: number;
  };
  readonly items: readonly FormulaDefinition[];
}

function createPatchFromCreateInput(
  imported: CreateFormulaDefinitionInput,
): PatchFormulaDefinitionInput {
  return {
    name: imported.name,
    ...(imported.description !== undefined
      ? { description: imported.description }
      : {}),
    inputs: imported.inputs,
    body: imported.body,
    enabled: imported.enabled,
  };
}

export async function replaceFormulasCatalog(
  formulaRuntime: FormulaRuntimeContext,
  tenantId: string,
  catalog: FormulaDefinitionsCatalogEnvelope,
): Promise<ReplaceFormulasCatalogResult> {
  const existing = await formulaRuntime.repository.list(tenantId);
  const availableFormulaNames =
    await formulaRuntime.getAvailableFormulaNames(tenantId);

  const validationErrors = validateFormulaCatalog(
    catalog.formulaDefinitions,
    availableFormulaNames,
  );
  if (validationErrors.length > 0) {
    throw new FormulaCatalogReplaceError(
      validationErrors
        .map((error) => `${error.path}: ${error.message}`)
        .join(" "),
    );
  }

  const plan = computeFormulaCatalogReplacePlan({
    existing,
    imported: catalog.formulaDefinitions,
  });

  for (const record of plan.toDelete) {
    await formulaRuntime.repository.delete(tenantId, record.id);
  }

  for (const { existing: current, input } of plan.toUpdate) {
    await formulaRuntime.repository.update(
      tenantId,
      current.id,
      createPatchFromCreateInput(input),
    );
  }

  for (const input of plan.toCreate) {
    await formulaRuntime.repository.create(tenantId, input);
  }

  formulaRuntime.invalidateTenant(tenantId);

  const items = await formulaRuntime.repository.list(tenantId);
  return {
    counts: plan.counts,
    items,
  };
}
