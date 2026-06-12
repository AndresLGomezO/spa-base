import type { UiLayoutDocument } from "@repo/ui-builder-core";
import { describe, expect, it, vi } from "vitest";

import {
  areSettingsSnapshotsEqual,
  applySettingsSnapshotToEditor,
  readSettingsSnapshot,
  type FormDesignerSettingsSnapshot,
} from "./form-designer-settings";

const baseSnapshot: FormDesignerSettingsSnapshot = {
  presentation: "plain",
  modalSize: "lg",
  modalSizeByBreakpoint: {},
  showHeader: true,
  flushContent: false,
  dedicatedFooter: false,
};

describe("form-designer-settings", () => {
  it("detects snapshot differences", () => {
    expect(areSettingsSnapshotsEqual(baseSnapshot, baseSnapshot)).toBe(true);
    expect(
      areSettingsSnapshotsEqual(baseSnapshot, {
        ...baseSnapshot,
        modalSize: "md",
      }),
    ).toBe(false);
    expect(
      areSettingsSnapshotsEqual(baseSnapshot, {
        ...baseSnapshot,
        modalSizeByBreakpoint: { base: "2xl" },
      }),
    ).toBe(false);
  });

  it("reads settings snapshot from editor state", () => {
    expect(
      readSettingsSnapshot({
        presentation: "wizard",
        modalSize: "xl",
        modalSizeByBreakpoint: { base: "2xl" },
        modalChrome: { showHeader: false, contentPadding: "none" },
        modalFooterLayout: {} as unknown as UiLayoutDocument,
      }),
    ).toEqual({
      presentation: "wizard",
      modalSize: "xl",
      modalSizeByBreakpoint: { base: "2xl" },
      showHeader: false,
      flushContent: true,
      dedicatedFooter: true,
    });
  });

  it("applies snapshot to editor setters", () => {
    const setPresentation = vi.fn();
    const setModalSize = vi.fn();
    const setModalSizeByBreakpoint = vi.fn();
    const setShowModalHeader = vi.fn();
    const setFlushModalContent = vi.fn();
    const enableModalFooterLayout = vi.fn();
    const disableModalFooterLayout = vi.fn();

    applySettingsSnapshotToEditor(
      {
        setPresentation,
        setModalSize,
        setModalSizeByBreakpoint,
        setShowModalHeader,
        setFlushModalContent,
        enableModalFooterLayout,
        disableModalFooterLayout,
        modalFooterLayout: undefined,
      },
      {
        presentation: "wizard",
        modalSize: "sm",
        modalSizeByBreakpoint: { lg: "xl" },
        showHeader: false,
        flushContent: true,
        dedicatedFooter: true,
      },
    );

    expect(setPresentation).toHaveBeenCalledWith("wizard");
    expect(setModalSize).toHaveBeenCalledWith("sm");
    expect(setModalSizeByBreakpoint).toHaveBeenCalledWith({ lg: "xl" });
    expect(setShowModalHeader).toHaveBeenCalledWith(false);
    expect(setFlushModalContent).toHaveBeenCalledWith(true);
    expect(enableModalFooterLayout).toHaveBeenCalled();
    expect(disableModalFooterLayout).not.toHaveBeenCalled();
  });
});
