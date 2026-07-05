import {
  resolveFormModalChrome,
  resolveFormModalFooterLayout,
  resolveFormModalSize,
  resolveFormModalSizeByBreakpointFromDefinition,
  resolveFormPresentation,
  type FormModalSize,
  type FormModalSizeByBreakpoint,
  type SerializableEntityDefinition,
} from "@repo/entities";

import type { UseEntityFormLayoutEditorResult } from "../ui-builder/use-entity-form-layout-editor";
import { resolveFormLayoutPresetId } from "../ui-builder/use-entity-form-layout-editor";
import type { LayoutPresetId } from "../ui-builder/use-layout-system-preset-catalog";

export interface FormDesignerSettingsSnapshot {
  readonly layoutPresetId: LayoutPresetId;
  readonly modalSize: FormModalSize;
  readonly modalSizeByBreakpoint: FormModalSizeByBreakpoint;
  readonly showHeader: boolean;
  readonly flushContent: boolean;
  readonly dedicatedFooter: boolean;
}

function areModalSizeByBreakpointsEqual(
  left: FormModalSizeByBreakpoint,
  right: FormModalSizeByBreakpoint,
): boolean {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]) as Set<
    keyof FormModalSizeByBreakpoint
  >;

  for (const key of keys) {
    if (left[key] !== right[key]) {
      return false;
    }
  }

  return true;
}

export function readSettingsSnapshot(
  editor: Pick<
    UseEntityFormLayoutEditorResult,
    | "layoutPresetId"
    | "modalSize"
    | "modalSizeByBreakpoint"
    | "modalChrome"
    | "modalFooterLayout"
  >,
): FormDesignerSettingsSnapshot {
  return {
    layoutPresetId: editor.layoutPresetId,
    modalSize: editor.modalSize,
    modalSizeByBreakpoint: editor.modalSizeByBreakpoint,
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
    layoutPresetId: resolveFormLayoutPresetId(
      resolveFormPresentation(definition),
    ),
    modalSize: resolveFormModalSize(definition),
    modalSizeByBreakpoint:
      resolveFormModalSizeByBreakpointFromDefinition(definition),
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
    left.layoutPresetId === right.layoutPresetId &&
    left.modalSize === right.modalSize &&
    areModalSizeByBreakpointsEqual(
      left.modalSizeByBreakpoint,
      right.modalSizeByBreakpoint,
    ) &&
    left.showHeader === right.showHeader &&
    left.flushContent === right.flushContent &&
    left.dedicatedFooter === right.dedicatedFooter
  );
}

export function applySettingsSnapshotToEditor(
  editor: Pick<
    UseEntityFormLayoutEditorResult,
    | "applyFormSystemPreset"
    | "setModalSize"
    | "setModalSizeByBreakpoint"
    | "setShowModalHeader"
    | "setFlushModalContent"
    | "enableModalFooterLayout"
    | "disableModalFooterLayout"
    | "modalFooterLayout"
  >,
  snapshot: FormDesignerSettingsSnapshot,
): void {
  const builtinId =
    snapshot.layoutPresetId === "plain-form" ||
    snapshot.layoutPresetId === "wizard-form"
      ? snapshot.layoutPresetId
      : null;
  if (builtinId) {
    editor.applyFormSystemPreset({ source: "builtin", id: builtinId });
  }

  editor.setModalSize(snapshot.modalSize);
  editor.setModalSizeByBreakpoint(snapshot.modalSizeByBreakpoint);
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
