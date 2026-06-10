import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { LayoutRenderContext } from "@repo/ui-builder-renderer";
import type { UiLayoutDocument } from "@repo/ui-builder-core";

import {
  resolveEntityFormModalFooter,
  useEntityFormModalFooter,
} from "./use-entity-form-modal-footer";

const wizardShellLayout = {
  root: {
    type: "root",
    id: "root",
    columnCount: 1,
    columns: [
      {
        id: "col",
        rows: [
          {
            type: "component",
            id: "actions",
            component: {
              kind: "wizard-actions",
              nextLabel: "Next",
              backLabel: "Back",
              cancelLabel: "Cancel",
            },
          },
        ],
      },
    ],
  },
} as UiLayoutDocument;

const footerContext = {
  mode: "form",
  data: {},
  locale: "en",
} as LayoutRenderContext;

describe("resolveEntityFormModalFooter", () => {
  it("resolves wizard actions from the shell layout fallback", () => {
    const footer = resolveEntityFormModalFooter({
      enabled: true,
      fallbackLayout: wizardShellLayout,
      footerContext,
      wizardMode: "create",
      wizardCurrentStepIndex: 0,
      wizardTotalSteps: 3,
      wizardOnNext: vi.fn(),
      wizardOnBack: vi.fn(),
      wizardOnCancel: vi.fn(),
    });

    expect(footer).not.toBeNull();
  });
});

describe("useEntityFormModalFooter", () => {
  it("does not publish when enabled is false", () => {
    const onFooterChange = vi.fn();

    renderHook(() =>
      useEntityFormModalFooter({
        enabled: false,
        fallbackLayout: wizardShellLayout,
        footerContext,
        onFooterChange,
      }),
    );

    expect(onFooterChange).not.toHaveBeenCalled();
  });

  it("keeps the child footer when a disabled parent hook shares onFooterChange", () => {
    const onFooterChange = vi.fn();

    const sharedHookProps = {
      fallbackLayout: wizardShellLayout,
      footerContext,
      wizardMode: "create" as const,
      wizardCurrentStepIndex: 0,
      wizardTotalSteps: 3,
      wizardOnNext: vi.fn(),
      wizardOnBack: vi.fn(),
      wizardOnCancel: vi.fn(),
      onFooterChange,
    };

    renderHook(() => {
      useEntityFormModalFooter({ ...sharedHookProps, enabled: false });
      useEntityFormModalFooter({ ...sharedHookProps, enabled: true });
    });

    expect(onFooterChange).toHaveBeenCalledTimes(1);
    expect(onFooterChange.mock.calls.at(-1)?.[0]).not.toBeNull();
  });

  it("does not republish the footer when wizard callbacks change identity", () => {
    const onFooterChange = vi.fn();

    const hookProps = {
      enabled: true,
      fallbackLayout: wizardShellLayout,
      footerContext,
      wizardMode: "create" as const,
      wizardCurrentStepIndex: 0,
      wizardTotalSteps: 3,
      wizardOnNext: vi.fn(),
      wizardOnBack: vi.fn(),
      wizardOnCancel: vi.fn(),
      wizardOnSubmit: vi.fn(),
      onFooterChange,
    };

    const { rerender } = renderHook(
      (props: typeof hookProps) => useEntityFormModalFooter(props),
      { initialProps: hookProps },
    );

    expect(onFooterChange).toHaveBeenCalledTimes(1);

    rerender({
      ...hookProps,
      wizardOnSubmit: vi.fn(),
      wizardOnNext: vi.fn(),
    });

    expect(onFooterChange).toHaveBeenCalledTimes(1);
  });

  it("publishes the footer before unmount cleanup clears it on reopen", () => {
    const onFooterChange = vi.fn();

    const hookProps = {
      enabled: true,
      fallbackLayout: wizardShellLayout,
      footerContext,
      wizardMode: "create" as const,
      wizardCurrentStepIndex: 0,
      wizardTotalSteps: 3,
      wizardOnNext: vi.fn(),
      wizardOnBack: vi.fn(),
      wizardOnCancel: vi.fn(),
      onFooterChange,
    };

    const firstMount = renderHook(() => useEntityFormModalFooter(hookProps));

    expect(onFooterChange).toHaveBeenCalled();
    expect(onFooterChange.mock.calls.at(-1)?.[0]).not.toBeNull();

    firstMount.unmount();
    expect(onFooterChange.mock.calls.at(-1)?.[0]).toBeNull();

    onFooterChange.mockClear();
    renderHook(() => useEntityFormModalFooter(hookProps));
    expect(onFooterChange).toHaveBeenCalled();
    expect(onFooterChange.mock.calls.at(-1)?.[0]).not.toBeNull();
  });
});
