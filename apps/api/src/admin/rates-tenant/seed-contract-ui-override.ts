import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  migrateListPresentation,
  normalizeEntityViews,
  putEntityUiOverrideInputSchema,
  serializeEntityDefinition,
  validateEntityUIConfig,
  type EntityUIConfig,
  type PutEntityUiOverrideInput,
  type UiLayoutDocument,
  type WizardFormConfig,
} from "@repo/entities";
import type { EntityUiOverrideRepository } from "@repo/firestore-converters";

import type { EntityRuntimeContext } from "../../entities/entity-runtime-context.js";

const ENTITY_NAME = "contract" as const;

const COMMITTED_FIXTURE_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures/contract-wizard-ui-override.json",
);

const EMULATOR_CURL_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../data/emulator/tenants/rates/CURL with error.js",
);

function extractWizardFormsFromCurl(
  curlPath: string,
): NonNullable<PutEntityUiOverrideInput["forms"]> {
  const curl = fs.readFileSync(curlPath, "utf8");
  const marker = "--data-raw '";
  const start = curl.indexOf(marker) + marker.length;
  const end = curl.lastIndexOf("'");
  const payload = JSON.parse(curl.slice(start, end)) as {
    forms?: PutEntityUiOverrideInput["forms"];
  };

  if (!payload.forms?.wizard) {
    throw new Error("CURL payload is missing forms.wizard.");
  }

  return {
    presentation: payload.forms.presentation ?? "wizard",
    ...(payload.forms.modalSize ? { modalSize: payload.forms.modalSize } : {}),
    wizard: payload.forms.wizard,
  };
}

function extractWizardFormsFromJson(
  jsonPath: string,
): NonNullable<PutEntityUiOverrideInput["forms"]> {
  const payload = JSON.parse(fs.readFileSync(jsonPath, "utf8")) as {
    forms?: PutEntityUiOverrideInput["forms"];
  };

  if (!payload.forms?.wizard) {
    throw new Error(`Fixture ${jsonPath} is missing forms.wizard.`);
  }

  return {
    presentation: payload.forms.presentation ?? "wizard",
    ...(payload.forms.modalSize ? { modalSize: payload.forms.modalSize } : {}),
    wizard: payload.forms.wizard,
  };
}

function resolveWizardForms(): NonNullable<
  PutEntityUiOverrideInput["forms"]
> | null {
  if (fs.existsSync(EMULATOR_CURL_PATH)) {
    try {
      return extractWizardFormsFromCurl(EMULATOR_CURL_PATH);
    } catch (error) {
      console.warn(
        "[rates seed] Failed to read contract UI from emulator CURL fixture:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  if (fs.existsSync(COMMITTED_FIXTURE_PATH)) {
    try {
      return extractWizardFormsFromJson(COMMITTED_FIXTURE_PATH);
    } catch (error) {
      console.warn(
        "[rates seed] Failed to read committed contract UI fixture:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  return null;
}

function buildWizardOnlyPutInput(
  entity: Parameters<typeof validateEntityUIConfig>[0],
  wizardForms: NonNullable<PutEntityUiOverrideInput["forms"]>,
): PutEntityUiOverrideInput {
  const defaultViews = serializeEntityDefinition(entity).ui
    .views as PutEntityUiOverrideInput["views"];

  return putEntityUiOverrideInputSchema.parse({
    views: [...defaultViews],
    forms: wizardForms,
  }) as PutEntityUiOverrideInput;
}

function mergeUiLikeApiRoute(
  entity: Parameters<typeof validateEntityUIConfig>[0],
  parsedBody: PutEntityUiOverrideInput,
): EntityUIConfig {
  const serialized = serializeEntityDefinition(entity);
  const normalizedViews = normalizeEntityViews(
    parsedBody.views as EntityUIConfig["views"],
  );
  const overrideForms = parsedBody.forms;
  const sharedPlainLayout =
    overrideForms?.layout ?? overrideForms?.create ?? overrideForms?.edit;
  const presentation =
    overrideForms?.presentation ??
    (overrideForms?.wizard ? ("wizard" as const) : undefined) ??
    serialized.ui.forms.presentation;
  const wizard = (overrideForms?.wizard ?? serialized.ui.forms.wizard) as
    | WizardFormConfig
    | undefined;
  const modalSize = overrideForms?.modalSize ?? serialized.ui.forms.modalSize;

  return migrateListPresentation({
    ...serialized.ui,
    views: normalizedViews,
    forms: {
      ...(presentation ? { presentation } : {}),
      ...(wizard ? { wizard } : {}),
      ...(modalSize ? { modalSize } : {}),
      create: {
        ...serialized.ui.forms.create,
        ...(sharedPlainLayout && presentation !== "wizard"
          ? { layout: sharedPlainLayout as UiLayoutDocument }
          : parsedBody.forms?.create
            ? { layout: parsedBody.forms.create as UiLayoutDocument }
            : {}),
      },
      edit: {
        ...serialized.ui.forms.edit,
        ...(sharedPlainLayout && presentation !== "wizard"
          ? { layout: sharedPlainLayout as UiLayoutDocument }
          : parsedBody.forms?.edit
            ? { layout: parsedBody.forms.edit as UiLayoutDocument }
            : {}),
      },
    },
    ...(parsedBody.listViewType
      ? { listViewType: parsedBody.listViewType }
      : {}),
    ...(parsedBody.listItem
      ? { listItem: parsedBody.listItem as UiLayoutDocument }
      : {}),
    ...(parsedBody.mainPage
      ? { mainPageLayout: parsedBody.mainPage as UiLayoutDocument }
      : {}),
    ...(parsedBody.recordDetail
      ? {
          recordDetailLayout: parsedBody.recordDetail as UiLayoutDocument,
          detailLayout: parsedBody.recordDetail as UiLayoutDocument,
        }
      : {}),
  });
}

export async function seedRatesContractUiOverride(
  tenantId: string,
  entityRuntime: EntityRuntimeContext,
  uiOverrideRepository: EntityUiOverrideRepository,
): Promise<boolean> {
  const wizardForms = resolveWizardForms();
  if (!wizardForms) {
    console.warn(
      "[rates seed] Contract wizard UI fixture not found; skipping UI override seed.",
    );
    return false;
  }

  await entityRuntime.loadTenantDefinitions(tenantId);
  const entity = entityRuntime.getEntityDefinition(ENTITY_NAME, tenantId);
  if (!entity) {
    throw new Error(
      `Entity "${ENTITY_NAME}" not found for tenant "${tenantId}".`,
    );
  }

  const payload = buildWizardOnlyPutInput(entity, wizardForms);
  const mergedUi = mergeUiLikeApiRoute(entity, payload);

  try {
    validateEntityUIConfig(entity, mergedUi);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Contract UI payload failed validation: ${message}`);
  }

  await uiOverrideRepository.put(tenantId, ENTITY_NAME, payload);
  console.log(
    `[rates seed] Saved contract wizard UI override for tenant "${tenantId}".`,
  );
  return true;
}
