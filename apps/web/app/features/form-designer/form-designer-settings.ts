import {
  resolveFormModalChrome,
  resolveFormModalFooterLayout,
  resolveFormModalSize,
  resolveFormPresentation,
  type FormModalSize,
  type FormPresentation,
  type SerializableEntityDefinition,
} from "@repo/entities";

import type { UseEntityFormLayoutEditorResult } from "../ui-builder/use-entity-form-layout-editor";

export interface FormDesignerSettingsSnapshot {
  readonly presentation: FormPresentation;
  readonly modalSize: FormModalSize;
  readonly showHeader: boolean;
  readonly flushContent: boolean;
  readonly dedicatedFooter: boolean;
}

export function readSettingsSnapshot(
  editor: Pick<
    UseEntityFormLayoutEditorResult,
    "presentation" | "modalSize" | "modalChrome" | "modalFooterLayout"
  >,
): FormDesignerSettingsSnapshot {
  return {
    presentation: editor.presentation,
    modalSize: editor.modalSize,
    showHeader: editor.modalChrome.showHeader ?? true,
    flushContent: editor.modalChrome.contentPadding === "none",
    dedicatedFooter: editor.modalFooterLayout != null,
  };
}

export function readSettingsSnapshotFromDefinition(
  definition: SerializableEntityDefinition,
): FormDesignerSettingsSnapshot {
  const chrome = resolveFormModalChrome(definition);
  return {
    presentation: resolveFormPresentation(definition),
    modalSize: resolveFormModalSize(definition),
    showHeader: chrome.showHeader,
    flushContent: chrome.contentPadding === "none",
    dedicatedFooter: resolveFormModalFooterLayout(definition) != null,
  };
}

export function areSettingsSnapshotsEqual(
  left: FormDesignerSettingsSnapshot,
  right: FormDesignerSettingsSnapshot,
): boolean {
  return (
    left.presentation === right.presentation &&
    left.modalSize === right.modalSize &&
    left.showHeader === right.showHeader &&
    left.flushContent === right.flushContent &&
    left.dedicatedFooter === right.dedicatedFooter
  );
}

export function applySettingsSnapshotToEditor(
  editor: Pick<
    UseEntityFormLayoutEditorResult,
    | "setPresentation"
    | "setModalSize"
    | "setShowModalHeader"
    | "setFlushModalContent"
    | "enableModalFooterLayout"
    | "disableModalFooterLayout"
    | "modalFooterLayout"
  >,
  snapshot: FormDesignerSettingsSnapshot,
): void {
  editor.setPresentation(snapshot.presentation);
  editor.setModalSize(snapshot.modalSize);
  editor.setShowModalHeader(snapshot.showHeader);
  editor.setFlushModalContent(snapshot.flushContent);

  if (snapshot.dedicatedFooter) {
    if (editor.modalFooterLayout == null) {
      editor.enableModalFooterLayout();
    }
  } else {
    editor.disableModalFooterLayout();
  }
}
