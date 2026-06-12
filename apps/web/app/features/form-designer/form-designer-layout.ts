import {
  resolveFormPresentation,
  resolvePlainFormLayout,
  resolveWizardForm,
  type FormPresentation,
  type SerializableEntityDefinition,
} from "@repo/entities";
import { createDefaultWizardShellLayout } from "@repo/ui-builder-core";
import type { UiLayoutDocument } from "@repo/ui-builder-core";

import type { UseEntityFormLayoutEditorResult } from "../ui-builder/use-entity-form-layout-editor";

interface FormDesignerOuterLayoutBinding {
  readonly layout: UiLayoutDocument;
  readonly setLayout: (layout: UiLayoutDocument) => void;
}

export interface FormDesignerLayoutSnapshot {
  readonly layout: UiLayoutDocument;
}

export function getFormDesignerOuterLayout(
  editor: Pick<
    UseEntityFormLayoutEditorResult,
    | "presentation"
    | "plainLayout"
    | "setPlainLayout"
    | "wizard"
    | "setShellLayout"
  >,
): FormDesignerOuterLayoutBinding {
  if (editor.presentation === "wizard") {
    return {
      layout: editor.wizard.shellLayout,
      setLayout: editor.setShellLayout,
    };
  }

  return {
    layout: editor.plainLayout,
    setLayout: editor.setPlainLayout,
  };
}

export function readLayoutSnapshot(
  layout: UiLayoutDocument,
): FormDesignerLayoutSnapshot {
  return {
    layout: structuredClone(layout),
  };
}

export function readLayoutSnapshotFromDefinition(
  definition: SerializableEntityDefinition,
  presentation: FormPresentation = resolveFormPresentation(definition),
): FormDesignerLayoutSnapshot {
  if (presentation === "wizard") {
    const wizard = resolveWizardForm(definition);
    return {
      layout: structuredClone(
        wizard?.shellLayout ?? createDefaultWizardShellLayout(),
      ),
    };
  }

  const plain = resolvePlainFormLayout(definition);

  return {
    layout: structuredClone(plain),
  };
}

export function areLayoutSnapshotsEqual(
  left: FormDesignerLayoutSnapshot,
  right: FormDesignerLayoutSnapshot,
): boolean {
  return JSON.stringify(left.layout) === JSON.stringify(right.layout);
}

export function applyLayoutSnapshotToEditor(
  editor: Pick<
    UseEntityFormLayoutEditorResult,
    | "presentation"
    | "plainLayout"
    | "setPlainLayout"
    | "wizard"
    | "setShellLayout"
  >,
  snapshot: FormDesignerLayoutSnapshot,
  presentation: FormPresentation,
): void {
  const { setLayout } = getFormDesignerOuterLayout({
    ...editor,
    presentation,
  });
  setLayout(structuredClone(snapshot.layout));
}
