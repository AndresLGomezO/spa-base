import { ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS } from "@repo/entities";
import { useThirdRail } from "@repo/ui";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSearchParams } from "react-router";
import { useColorScheme } from "@repo/theme/react";

import { useAnyPermission } from "../../auth/useAnyPermission";
import {
  DEFAULT_LAYOUT_PREVIEW_BREAKPOINT,
  type LayoutPreviewBreakpoint,
} from "../ui-builder/LayoutPreviewPanel";
import { useTenantSidebarLayoutEditor } from "../ui-builder/use-tenant-sidebar-layout-editor";
import { DEFAULT_MOBILE_PREVIEW_DEVICE_ID } from "../form-designer/mobile-preview-device-presets";
import type { MobilePreviewDeviceId } from "../form-designer/mobile-preview-device-presets";
import type { ComponentColumnRef } from "../form-designer/form-designer-component-column-ref";
import type { ComponentRowRef } from "../form-designer/form-designer-component-row-ref";
import {
  APP_SHELL_FOCUS_SEARCH_PARAM,
  applyAppShellFocusToSearchParams,
  parseAppShellDesignFocus,
  type AppShellDesignFocus,
} from "./app-shell-designer-tabs";
import {
  SidebarLayoutDesignerContext,
  type SidebarLayoutDesignerContextValue,
} from "./sidebar-layout-designer-context";
import {
  applyPanelSessionSnapshot,
  readPanelLayoutSnapshot,
} from "./sidebar-layout-designer-layout-binding";
import {
  areSidebarLayoutPanelTargetsEqual,
  isSidebarLayoutPanelSessionDirty,
  type SidebarLayoutPanelPendingAction,
  type SidebarLayoutPanelSession,
  type SidebarLayoutPanelTarget,
  type SidebarLayoutUnsavedReason,
} from "./sidebar-layout-designer-panel-session";
import { sidebarLayoutDesignerThirdRail } from "./sidebar-layout-designer-third-rail";
import {
  applySidebarLayoutSnapshotToEditor,
  areSidebarLayoutSnapshotsEqual,
  readSidebarLayoutSnapshot,
  type SidebarLayoutDesignerSnapshot,
} from "./sidebar-layout-designer-snapshots";

const SidebarThirdRailHeaderActions =
  sidebarLayoutDesignerThirdRail.HeaderActions;
const SidebarThirdRailBody = sidebarLayoutDesignerThirdRail.Body;
const SidebarThirdRailFooter = sidebarLayoutDesignerThirdRail.Footer;

interface SidebarLayoutDesignerProviderProps {
  readonly children: ReactNode;
}

export function SidebarLayoutDesignerProvider({
  children,
}: SidebarLayoutDesignerProviderProps) {
  const editor = useTenantSidebarLayoutEditor();
  const canSave = useAnyPermission(ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS);
  const [searchParams, setSearchParams] = useSearchParams();
  const { colorScheme: appColorScheme } = useColorScheme();

  const {
    open: openThirdRail,
    close: closeThirdRail,
    update: updateThirdRail,
  } = useThirdRail();

  const [previewBreakpoint, setPreviewBreakpoint] =
    useState<LayoutPreviewBreakpoint>(DEFAULT_LAYOUT_PREVIEW_BREAKPOINT);
  const [previewMobileDeviceId, setPreviewMobileDeviceId] =
    useState<MobilePreviewDeviceId>(DEFAULT_MOBILE_PREVIEW_DEVICE_ID);
  const [previewColorScheme, setPreviewColorScheme] = useState(appColorScheme);

  const [savedBaseline, setSavedBaseline] =
    useState<SidebarLayoutDesignerSnapshot>(() =>
      readSidebarLayoutSnapshot(editor),
    );

  const [unsavedChangesOpen, setUnsavedChangesOpen] = useState(false);
  const [unsavedReason, setUnsavedReason] =
    useState<SidebarLayoutUnsavedReason | null>(null);
  const [pendingPanelAction, setPendingPanelAction] =
    useState<SidebarLayoutPanelPendingAction | null>(null);
  const [pendingDesignFocus, setPendingDesignFocus] =
    useState<AppShellDesignFocus | null>(null);

  const [structurePanelSession, setStructurePanelSession] =
    useState<SidebarLayoutPanelSession | null>(null);
  const structurePanelSessionRef = useRef(structurePanelSession);
  structurePanelSessionRef.current = structurePanelSession;
  const editorRef = useRef(editor);
  editorRef.current = editor;
  const contextValueRef = useRef<SidebarLayoutDesignerContextValue | null>(
    null,
  );
  const hasSyncedBaselinesRef = useRef(false);

  const designFocus = useMemo(
    () =>
      parseAppShellDesignFocus(searchParams.get(APP_SHELL_FOCUS_SEARCH_PARAM)),
    [searchParams],
  );
  const designFocusRef = useRef(designFocus);
  designFocusRef.current = designFocus;

  const currentSnapshot = useMemo(
    () => readSidebarLayoutSnapshot(editor),
    [editor],
  );

  const layoutIsDirty = useMemo(
    () => !areSidebarLayoutSnapshotsEqual(savedBaseline, currentSnapshot),
    [currentSnapshot, savedBaseline],
  );

  const currentPanelLayoutSnapshot = useMemo(() => {
    if (!structurePanelSession) {
      return null;
    }

    return readPanelLayoutSnapshot(editor, designFocus);
  }, [designFocus, editor, structurePanelSession]);

  const structurePanelIsDirty = useMemo(() => {
    if (!structurePanelSession || !currentPanelLayoutSnapshot) {
      return false;
    }

    return isSidebarLayoutPanelSessionDirty(
      structurePanelSession,
      currentPanelLayoutSnapshot,
    );
  }, [currentPanelLayoutSnapshot, structurePanelSession]);

  const selectedStructureRowRef =
    structurePanelSession?.target.kind === "row"
      ? structurePanelSession.target.rowRef
      : null;
  const selectedStructureColumnRef =
    structurePanelSession?.target.kind === "column"
      ? structurePanelSession.target.columnRef
      : null;

  useEffect(() => {
    if (!editor.isHydrated) {
      hasSyncedBaselinesRef.current = false;
      return;
    }

    if (hasSyncedBaselinesRef.current) {
      return;
    }

    setSavedBaseline(readSidebarLayoutSnapshot(editor));
    hasSyncedBaselinesRef.current = true;
  }, [
    editor,
    editor.isHydrated,
    editor.sidebarLayout,
    editor.headerLayout,
    editor.footerLayout,
    editor.settings,
  ]);

  const navigateToFocus = useCallback(
    (focus: AppShellDesignFocus) => {
      setSearchParams(
        (current) => applyAppShellFocusToSearchParams(current, focus),
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const saveLayout = useCallback(async (): Promise<string | null> => {
    const error = await editor.saveLayout();
    if (error === null) {
      setSavedBaseline(readSidebarLayoutSnapshot(editorRef.current));
    }
    return error;
  }, [editor]);

  const resetToPlatformDefault = useCallback(async (): Promise<
    string | null
  > => {
    const error = await editor.resetToPlatformDefault();
    if (error === null) {
      setSavedBaseline(readSidebarLayoutSnapshot(editorRef.current));
      setStructurePanelSession(null);
    }
    return error;
  }, [editor]);

  const discardLayout = useCallback(() => {
    applySidebarLayoutSnapshotToEditor(editor, savedBaseline);
  }, [editor, savedBaseline]);

  const closeStructurePanel = useCallback(() => {
    structurePanelSessionRef.current = null;
    setStructurePanelSession(null);
    closeThirdRail();
  }, [closeThirdRail]);

  const requestDesignFocusChange = useCallback(
    (focus: AppShellDesignFocus) => {
      if (focus === designFocus) {
        return;
      }

      if (layoutIsDirty) {
        setPendingDesignFocus(focus);
        setUnsavedReason("tab");
        setUnsavedChangesOpen(true);
        return;
      }

      if (structurePanelSession) {
        closeStructurePanel();
      }

      navigateToFocus(focus);
    },
    [
      closeStructurePanel,
      designFocus,
      layoutIsDirty,
      navigateToFocus,
      structurePanelSession,
    ],
  );

  const guardStructurePanelClose = useCallback((): void | boolean => {
    const session = structurePanelSessionRef.current;
    if (!session) {
      return;
    }

    const current = readPanelLayoutSnapshot(
      editorRef.current,
      designFocusRef.current,
    );
    if (isSidebarLayoutPanelSessionDirty(session, current)) {
      setPendingPanelAction({ type: "close" });
      setUnsavedReason("structurePanel");
      setUnsavedChangesOpen(true);
      return false;
    }

    setStructurePanelSession(null);
  }, []);

  const openStructurePanelAt = useCallback(
    (target: SidebarLayoutPanelTarget, label: string) => {
      const currentEditor = editorRef.current;
      const baseline = readPanelLayoutSnapshot(
        currentEditor,
        designFocusRef.current,
      );
      const session: SidebarLayoutPanelSession = {
        target,
        label,
        baseline,
      };
      structurePanelSessionRef.current = session;
      setStructurePanelSession(session);

      if (!contextValueRef.current) {
        return;
      }

      openThirdRail({
        title: label,
        headerActions: <SidebarThirdRailHeaderActions />,
        body: <SidebarThirdRailBody />,
        footer: <SidebarThirdRailFooter />,
        resizeContent: true,
        onClose: guardStructurePanelClose,
      });
    },
    [guardStructurePanelClose, openThirdRail],
  );

  const switchStructurePanel = useCallback(
    (target: SidebarLayoutPanelTarget, label: string) => {
      const currentEditor = editorRef.current;
      const baseline = readPanelLayoutSnapshot(
        currentEditor,
        designFocusRef.current,
      );
      const session: SidebarLayoutPanelSession = {
        target,
        label,
        baseline,
      };
      structurePanelSessionRef.current = session;
      setStructurePanelSession(session);

      if (!contextValueRef.current) {
        return;
      }

      updateThirdRail({
        title: label,
      });
    },
    [updateThirdRail],
  );

  const executePendingPanelAction = useCallback(
    (action: SidebarLayoutPanelPendingAction) => {
      if (action.type === "close") {
        closeStructurePanel();
        return;
      }

      switchStructurePanel(action.target, action.label);
    },
    [closeStructurePanel, switchStructurePanel],
  );

  const requestStructurePanel = useCallback(
    (target: SidebarLayoutPanelTarget, label: string) => {
      if (!structurePanelSession) {
        openStructurePanelAt(target, label);
        return;
      }

      if (
        areSidebarLayoutPanelTargetsEqual(structurePanelSession.target, target)
      ) {
        if (structurePanelIsDirty) {
          setPendingPanelAction({ type: "close" });
          setUnsavedReason("structurePanel");
          setUnsavedChangesOpen(true);
          return;
        }
        closeStructurePanel();
        return;
      }

      if (structurePanelIsDirty) {
        setPendingPanelAction({
          type: "switch",
          target,
          label,
        });
        setUnsavedReason("structurePanel");
        setUnsavedChangesOpen(true);
        return;
      }

      switchStructurePanel(target, label);
    },
    [
      closeStructurePanel,
      openStructurePanelAt,
      structurePanelIsDirty,
      structurePanelSession,
      switchStructurePanel,
    ],
  );

  const requestComponentRowPanel = useCallback(
    (rowRef: ComponentRowRef, label: string) => {
      requestStructurePanel({ kind: "row", rowRef }, label);
    },
    [requestStructurePanel],
  );

  const requestComponentColumnPanel = useCallback(
    (columnRef: ComponentColumnRef, label: string) => {
      requestStructurePanel({ kind: "column", columnRef }, label);
    },
    [requestStructurePanel],
  );

  const requestCloseStructurePanel = useCallback(() => {
    if (!structurePanelSession) {
      closeThirdRail();
      return;
    }

    if (structurePanelIsDirty) {
      setPendingPanelAction({ type: "close" });
      setUnsavedReason("structurePanel");
      setUnsavedChangesOpen(true);
      return;
    }

    closeStructurePanel();
  }, [
    closeStructurePanel,
    closeThirdRail,
    structurePanelIsDirty,
    structurePanelSession,
  ]);

  const commitStructurePanelSave = useCallback(() => {
    if (!structurePanelSession || !currentPanelLayoutSnapshot) {
      closeStructurePanel();
      return;
    }

    const savedSession: SidebarLayoutPanelSession = {
      ...structurePanelSession,
      baseline: currentPanelLayoutSnapshot,
    };
    structurePanelSessionRef.current = savedSession;
    setStructurePanelSession(savedSession);
    closeStructurePanel();
  }, [closeStructurePanel, currentPanelLayoutSnapshot, structurePanelSession]);

  const confirmUnsavedSave = useCallback(async () => {
    if (unsavedReason === "structurePanel") {
      const action = pendingPanelAction;
      if (!action || !structurePanelSession || !currentPanelLayoutSnapshot) {
        setUnsavedChangesOpen(false);
        return;
      }

      const savedSession: SidebarLayoutPanelSession = {
        ...structurePanelSession,
        baseline: currentPanelLayoutSnapshot,
      };
      structurePanelSessionRef.current = savedSession;
      setStructurePanelSession(savedSession);
      setUnsavedChangesOpen(false);
      setPendingPanelAction(null);
      setUnsavedReason(null);
      executePendingPanelAction(action);
      return;
    }

    const nextFocus = pendingDesignFocus;
    if (!nextFocus) {
      return;
    }

    const error = await saveLayout();
    if (error) {
      return;
    }

    setUnsavedChangesOpen(false);
    setPendingDesignFocus(null);
    setUnsavedReason(null);
    if (structurePanelSession) {
      closeStructurePanel();
    }
    navigateToFocus(nextFocus);
  }, [
    closeStructurePanel,
    currentPanelLayoutSnapshot,
    executePendingPanelAction,
    navigateToFocus,
    pendingDesignFocus,
    pendingPanelAction,
    saveLayout,
    structurePanelSession,
    unsavedReason,
  ]);

  const confirmUnsavedDiscard = useCallback(() => {
    if (unsavedReason === "structurePanel") {
      const action = pendingPanelAction;
      const session = structurePanelSession;
      if (!action || !session) {
        setUnsavedChangesOpen(false);
        return;
      }

      applyPanelSessionSnapshot(editor, session, designFocusRef.current);
      setUnsavedChangesOpen(false);
      setPendingPanelAction(null);
      setUnsavedReason(null);
      executePendingPanelAction(action);
      return;
    }

    const nextFocus = pendingDesignFocus;
    if (!nextFocus) {
      return;
    }

    discardLayout();
    setUnsavedChangesOpen(false);
    setPendingDesignFocus(null);
    setUnsavedReason(null);
    if (structurePanelSession) {
      closeStructurePanel();
    }
    navigateToFocus(nextFocus);
  }, [
    closeStructurePanel,
    discardLayout,
    editor,
    executePendingPanelAction,
    navigateToFocus,
    pendingDesignFocus,
    pendingPanelAction,
    structurePanelSession,
    unsavedReason,
  ]);

  const cancelUnsavedChanges = useCallback(() => {
    setUnsavedChangesOpen(false);
    setPendingPanelAction(null);
    setPendingDesignFocus(null);
    setUnsavedReason(null);
  }, []);

  const contextValue = useMemo(
    (): SidebarLayoutDesignerContextValue => ({
      editor,
      canSave,
      designFocus,
      layoutIsDirty,
      saveLayout,
      resetToPlatformDefault,
      discardLayout,
      requestDesignFocusChange,
      settings: editor.settings,
      setSettings: editor.setSettings,
      previewBreakpoint,
      setPreviewBreakpoint,
      previewMobileDeviceId,
      setPreviewMobileDeviceId,
      previewColorScheme,
      setPreviewColorScheme,
      unsavedReason,
      unsavedChangesOpen,
      confirmUnsavedSave,
      confirmUnsavedDiscard,
      cancelUnsavedChanges,
      structurePanelOpen: structurePanelSession != null,
      structurePanelIsDirty,
      selectedStructureRowRef,
      selectedStructureColumnRef,
      requestComponentRowPanel,
      requestComponentColumnPanel,
      requestCloseStructurePanel,
      commitStructurePanelSave,
    }),
    [
      cancelUnsavedChanges,
      canSave,
      commitStructurePanelSave,
      confirmUnsavedDiscard,
      confirmUnsavedSave,
      designFocus,
      discardLayout,
      editor,
      layoutIsDirty,
      previewBreakpoint,
      previewColorScheme,
      previewMobileDeviceId,
      requestCloseStructurePanel,
      requestComponentColumnPanel,
      requestComponentRowPanel,
      requestDesignFocusChange,
      saveLayout,
      resetToPlatformDefault,
      selectedStructureColumnRef,
      selectedStructureRowRef,
      structurePanelIsDirty,
      structurePanelSession,
      unsavedChangesOpen,
      unsavedReason,
    ],
  );

  contextValueRef.current = contextValue;

  useLayoutEffect(() => {
    sidebarLayoutDesignerThirdRail.publish({
      contextValue,
      session: structurePanelSession,
    });
  });

  return (
    <SidebarLayoutDesignerContext.Provider value={contextValue}>
      {children}
    </SidebarLayoutDesignerContext.Provider>
  );
}
