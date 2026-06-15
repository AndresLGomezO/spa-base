import { ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS } from "@repo/entities";
import { useThirdRail } from "@repo/ui";
import {
  useCallback,
  useEffect,
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
import { useTenantDashboardLayoutEditor } from "../ui-builder/use-tenant-dashboard-layout-editor";
import { DEFAULT_MOBILE_PREVIEW_DEVICE_ID } from "../form-designer/mobile-preview-device-presets";
import type { MobilePreviewDeviceId } from "../form-designer/mobile-preview-device-presets";
import type { ComponentColumnRef } from "../form-designer/form-designer-component-column-ref";
import type { ComponentRowRef } from "../form-designer/form-designer-component-row-ref";
import {
  DashboardLayoutDesignerContext,
  type DashboardLayoutDesignerContextValue,
} from "./dashboard-layout-designer-context";
import {
  applyPanelSessionSnapshot,
  readPanelLayoutSnapshot,
} from "./dashboard-layout-designer-layout-binding";
import {
  areDashboardLayoutPanelTargetsEqual,
  isDashboardLayoutPanelSessionDirty,
  type DashboardLayoutPanelPendingAction,
  type DashboardLayoutPanelSession,
  type DashboardLayoutPanelTarget,
  type DashboardLayoutUnsavedReason,
} from "./dashboard-layout-designer-panel-session";
import { renderDashboardLayoutStructurePanelChrome } from "./dashboard-layout-designer-structure-panel-chrome";
import {
  applyLayoutSnapshotToEditor,
  applySectionsSnapshotToEditor,
  areLayoutSnapshotsEqual,
  areSectionsSnapshotsEqual,
  readLayoutSnapshot,
  readLayoutSnapshotFromConfig,
  readSectionsSnapshot,
  readSectionsSnapshotFromConfig,
  type DashboardLayoutDesignerLayoutSnapshot,
  type DashboardLayoutDesignerSectionsSnapshot,
} from "./dashboard-layout-designer-snapshots";
import {
  DASHBOARD_LAYOUT_DESIGNER_TAB_SEARCH_PARAM,
  isDashboardLayoutDesignerTabId,
  parseDashboardLayoutDesignerTabId,
  type DashboardLayoutDesignerTabId,
} from "./dashboard-layout-designer-tabs";

function shouldConfirmTabChange(
  fromTab: DashboardLayoutDesignerTabId,
  toTab: DashboardLayoutDesignerTabId,
  sectionsIsDirty: boolean,
  layoutIsDirty: boolean,
): boolean {
  if (fromTab === toTab) {
    return false;
  }

  if (fromTab === "sections" && sectionsIsDirty) {
    return true;
  }

  if (fromTab === "layout" && layoutIsDirty) {
    return true;
  }

  return false;
}

function applyTabToSearchParams(
  searchParams: URLSearchParams,
  tabId: DashboardLayoutDesignerTabId,
): URLSearchParams {
  const next = new URLSearchParams(searchParams);
  if (tabId === "sections") {
    next.delete(DASHBOARD_LAYOUT_DESIGNER_TAB_SEARCH_PARAM);
  } else {
    next.set(DASHBOARD_LAYOUT_DESIGNER_TAB_SEARCH_PARAM, tabId);
  }
  return next;
}

interface DashboardLayoutDesignerProviderProps {
  readonly children: ReactNode;
}

export function DashboardLayoutDesignerProvider({
  children,
}: DashboardLayoutDesignerProviderProps) {
  const editor = useTenantDashboardLayoutEditor();
  const canSave = useAnyPermission(ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS);
  const [searchParams, setSearchParams] = useSearchParams();
  const { colorScheme: appColorScheme } = useColorScheme();

  const {
    open: openThirdRail,
    close: closeThirdRail,
    update: updateThirdRail,
    isOpen: isThirdRailOpen,
  } = useThirdRail();

  const [previewBreakpoint, setPreviewBreakpoint] =
    useState<LayoutPreviewBreakpoint>(DEFAULT_LAYOUT_PREVIEW_BREAKPOINT);
  const [previewMobileDeviceId, setPreviewMobileDeviceId] =
    useState<MobilePreviewDeviceId>(DEFAULT_MOBILE_PREVIEW_DEVICE_ID);
  const [previewColorScheme, setPreviewColorScheme] = useState(appColorScheme);

  const [savedSectionsBaseline, setSavedSectionsBaseline] =
    useState<DashboardLayoutDesignerSectionsSnapshot>(() =>
      readSectionsSnapshotFromConfig(null),
    );
  const [savedLayoutBaseline, setSavedLayoutBaseline] =
    useState<DashboardLayoutDesignerLayoutSnapshot>(() =>
      readLayoutSnapshotFromConfig(null),
    );

  const [unsavedChangesOpen, setUnsavedChangesOpen] = useState(false);
  const [pendingTabId, setPendingTabId] =
    useState<DashboardLayoutDesignerTabId | null>(null);
  const [unsavedTabId, setUnsavedTabId] =
    useState<DashboardLayoutDesignerTabId | null>(null);
  const [pendingSectionId, setPendingSectionId] = useState<string | null>(null);
  const [unsavedReason, setUnsavedReason] =
    useState<DashboardLayoutUnsavedReason | null>(null);
  const [pendingPanelAction, setPendingPanelAction] =
    useState<DashboardLayoutPanelPendingAction | null>(null);

  const [structurePanelSession, setStructurePanelSession] =
    useState<DashboardLayoutPanelSession | null>(null);
  const structurePanelSessionRef = useRef(structurePanelSession);
  structurePanelSessionRef.current = structurePanelSession;
  const editorRef = useRef(editor);
  editorRef.current = editor;
  const contextValueRef = useRef<DashboardLayoutDesignerContextValue | null>(
    null,
  );
  const hasSyncedBaselinesRef = useRef(false);

  const activeTabId = useMemo(
    () =>
      parseDashboardLayoutDesignerTabId(
        searchParams.get(DASHBOARD_LAYOUT_DESIGNER_TAB_SEARCH_PARAM),
      ),
    [searchParams],
  );
  const activeTabIdRef = useRef(activeTabId);
  activeTabIdRef.current = activeTabId;

  const currentSectionsSnapshot = useMemo(
    () => readSectionsSnapshot(editor),
    [editor],
  );

  const sectionsIsDirty = useMemo(
    () =>
      !areSectionsSnapshotsEqual(
        savedSectionsBaseline,
        currentSectionsSnapshot,
      ),
    [currentSectionsSnapshot, savedSectionsBaseline],
  );

  const currentLayoutSnapshot = useMemo(
    () => readLayoutSnapshot(editor),
    [editor],
  );

  const layoutIsDirty = useMemo(
    () => !areLayoutSnapshotsEqual(savedLayoutBaseline, currentLayoutSnapshot),
    [currentLayoutSnapshot, savedLayoutBaseline],
  );

  const currentPanelLayoutSnapshot = useMemo(() => {
    if (!structurePanelSession) {
      return null;
    }

    return readPanelLayoutSnapshot(editor, activeTabId);
  }, [activeTabId, editor, structurePanelSession]);

  const structurePanelIsDirty = useMemo(() => {
    if (!structurePanelSession || !currentPanelLayoutSnapshot) {
      return false;
    }

    return isDashboardLayoutPanelSessionDirty(
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

    setSavedSectionsBaseline(readSectionsSnapshot(editor));
    setSavedLayoutBaseline(readLayoutSnapshot(editor));
    hasSyncedBaselinesRef.current = true;
  }, [
    editor.isHydrated,
    editor.dashboardSections,
    editor.dashboardLayout,
    editor,
  ]);

  const navigateToTab = useCallback(
    (tabId: DashboardLayoutDesignerTabId) => {
      setSearchParams((current) => applyTabToSearchParams(current, tabId), {
        replace: true,
      });
    },
    [setSearchParams],
  );

  const saveSections = useCallback(async (): Promise<string | null> => {
    const error = await editor.saveSections();
    if (error === null) {
      setSavedSectionsBaseline(readSectionsSnapshot(editorRef.current));
    }
    return error;
  }, [editor]);

  const saveLayout = useCallback(async (): Promise<string | null> => {
    const error = await editor.saveLayout();
    if (error === null) {
      setSavedLayoutBaseline(readLayoutSnapshot(editorRef.current));
    }
    return error;
  }, [editor]);

  const discardSections = useCallback(() => {
    applySectionsSnapshotToEditor(editor, savedSectionsBaseline);
  }, [editor, savedSectionsBaseline]);

  const discardLayout = useCallback(() => {
    applyLayoutSnapshotToEditor(editor, savedLayoutBaseline);
  }, [editor, savedLayoutBaseline]);

  const switchSection = useCallback(
    (sectionId: string) => {
      editor.setSelectedSectionId(sectionId);
    },
    [editor],
  );

  const closeStructurePanel = useCallback(() => {
    structurePanelSessionRef.current = null;
    setStructurePanelSession(null);
    closeThirdRail();
  }, [closeThirdRail]);

  const guardStructurePanelClose = useCallback((): void | boolean => {
    const session = structurePanelSessionRef.current;
    if (!session) {
      return;
    }

    const currentEditor = editorRef.current;
    const tabId = activeTabIdRef.current;
    if (tabId === "sections" && !currentEditor.selectedSection) {
      return;
    }

    const current = readPanelLayoutSnapshot(currentEditor, tabId);
    if (isDashboardLayoutPanelSessionDirty(session, current)) {
      setPendingPanelAction({ type: "close" });
      setUnsavedReason("structurePanel");
      setUnsavedChangesOpen(true);
      return false;
    }

    setStructurePanelSession(null);
  }, []);

  const openStructurePanelAt = useCallback(
    (target: DashboardLayoutPanelTarget, label: string) => {
      const currentEditor = editorRef.current;
      const baseline = readPanelLayoutSnapshot(
        currentEditor,
        activeTabIdRef.current,
      );
      const session: DashboardLayoutPanelSession = {
        target,
        label,
        baseline,
      };
      structurePanelSessionRef.current = session;
      setStructurePanelSession(session);

      const contextValue = contextValueRef.current;
      if (!contextValue) {
        return;
      }

      openThirdRail({
        title: label,
        ...renderDashboardLayoutStructurePanelChrome(contextValue, session),
        resizeContent: true,
        onClose: guardStructurePanelClose,
      });
    },
    [guardStructurePanelClose, openThirdRail],
  );

  const switchStructurePanel = useCallback(
    (target: DashboardLayoutPanelTarget, label: string) => {
      const currentEditor = editorRef.current;
      const baseline = readPanelLayoutSnapshot(
        currentEditor,
        activeTabIdRef.current,
      );
      const session: DashboardLayoutPanelSession = {
        target,
        label,
        baseline,
      };
      structurePanelSessionRef.current = session;
      setStructurePanelSession(session);

      const contextValue = contextValueRef.current;
      if (!contextValue) {
        return;
      }

      updateThirdRail({
        title: label,
        ...renderDashboardLayoutStructurePanelChrome(contextValue, session),
      });
    },
    [updateThirdRail],
  );

  const executePendingPanelAction = useCallback(
    (action: DashboardLayoutPanelPendingAction) => {
      if (action.type === "close") {
        closeStructurePanel();
        return;
      }

      switchStructurePanel(action.target, action.label);
    },
    [closeStructurePanel, switchStructurePanel],
  );

  const requestStructurePanel = useCallback(
    (target: DashboardLayoutPanelTarget, label: string) => {
      if (!structurePanelSession) {
        openStructurePanelAt(target, label);
        return;
      }

      if (
        areDashboardLayoutPanelTargetsEqual(
          structurePanelSession.target,
          target,
        )
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

    const savedSession: DashboardLayoutPanelSession = {
      ...structurePanelSession,
      baseline: currentPanelLayoutSnapshot,
    };
    structurePanelSessionRef.current = savedSession;
    setStructurePanelSession(savedSession);
    closeStructurePanel();
  }, [closeStructurePanel, currentPanelLayoutSnapshot, structurePanelSession]);

  const requestTabChange = useCallback(
    (tabId: DashboardLayoutDesignerTabId) => {
      if (!isDashboardLayoutDesignerTabId(tabId) || tabId === activeTabId) {
        return;
      }

      if (
        shouldConfirmTabChange(
          activeTabId,
          tabId,
          sectionsIsDirty,
          layoutIsDirty,
        )
      ) {
        setPendingTabId(tabId);
        setUnsavedTabId(activeTabId);
        setUnsavedReason("tab");
        setUnsavedChangesOpen(true);
        return;
      }

      if (structurePanelSession) {
        closeStructurePanel();
      }

      navigateToTab(tabId);
    },
    [
      activeTabId,
      closeStructurePanel,
      navigateToTab,
      layoutIsDirty,
      structurePanelSession,
      sectionsIsDirty,
    ],
  );

  const requestSectionChange = useCallback(
    (sectionId: string) => {
      if (sectionId === editor.selectedSectionId) {
        return;
      }

      if (sectionsIsDirty || structurePanelIsDirty) {
        setPendingSectionId(sectionId);
        setUnsavedReason("section");
        setUnsavedChangesOpen(true);
        return;
      }

      if (structurePanelSession) {
        closeStructurePanel();
      }

      switchSection(sectionId);
    },
    [
      closeStructurePanel,
      editor.selectedSectionId,
      structurePanelIsDirty,
      structurePanelSession,
      switchSection,
      sectionsIsDirty,
    ],
  );

  const confirmUnsavedSave = useCallback(async () => {
    if (unsavedReason === "structurePanel") {
      const action = pendingPanelAction;
      if (!action || !structurePanelSession || !currentPanelLayoutSnapshot) {
        setUnsavedChangesOpen(false);
        return;
      }

      const savedSession: DashboardLayoutPanelSession = {
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

    if (unsavedReason === "section") {
      const nextSectionId = pendingSectionId;
      if (!nextSectionId) {
        return;
      }

      const error = await saveSections();
      if (error) {
        return;
      }

      setUnsavedChangesOpen(false);
      setPendingSectionId(null);
      setUnsavedReason(null);
      if (structurePanelSession) {
        closeStructurePanel();
      }
      switchSection(nextSectionId);
      return;
    }

    const tabId = unsavedTabId;
    const nextTabId = pendingTabId;
    if (!tabId || !nextTabId) {
      return;
    }

    const error =
      tabId === "sections" ? await saveSections() : await saveLayout();
    if (error) {
      return;
    }

    setUnsavedChangesOpen(false);
    setPendingTabId(null);
    setUnsavedTabId(null);
    setUnsavedReason(null);
    if (structurePanelSession) {
      closeStructurePanel();
    }
    navigateToTab(nextTabId);
  }, [
    closeStructurePanel,
    currentPanelLayoutSnapshot,
    executePendingPanelAction,
    navigateToTab,
    pendingPanelAction,
    pendingTabId,
    pendingSectionId,
    saveLayout,
    saveSections,
    structurePanelSession,
    switchSection,
    unsavedReason,
    unsavedTabId,
  ]);

  const confirmUnsavedDiscard = useCallback(() => {
    if (unsavedReason === "structurePanel") {
      const action = pendingPanelAction;
      const session = structurePanelSession;
      if (!action || !session) {
        setUnsavedChangesOpen(false);
        return;
      }

      applyPanelSessionSnapshot(editor, session, unsavedTabId ?? activeTabId);
      setUnsavedChangesOpen(false);
      setPendingPanelAction(null);
      setUnsavedReason(null);
      executePendingPanelAction(action);
      return;
    }

    if (unsavedReason === "section") {
      const nextSectionId = pendingSectionId;
      if (!nextSectionId) {
        return;
      }

      discardSections();
      setUnsavedChangesOpen(false);
      setPendingSectionId(null);
      setUnsavedReason(null);
      if (structurePanelSession) {
        closeStructurePanel();
      }
      switchSection(nextSectionId);
      return;
    }

    const tabId = unsavedTabId;
    const nextTabId = pendingTabId;
    if (!tabId || !nextTabId) {
      return;
    }

    if (tabId === "sections") {
      discardSections();
    } else {
      discardLayout();
    }

    setUnsavedChangesOpen(false);
    setPendingTabId(null);
    setUnsavedTabId(null);
    setUnsavedReason(null);
    if (structurePanelSession) {
      closeStructurePanel();
    }
    navigateToTab(nextTabId);
  }, [
    activeTabId,
    closeStructurePanel,
    discardLayout,
    discardSections,
    editor,
    executePendingPanelAction,
    navigateToTab,
    pendingPanelAction,
    pendingTabId,
    pendingSectionId,
    structurePanelSession,
    switchSection,
    unsavedReason,
    unsavedTabId,
  ]);

  const cancelUnsavedChanges = useCallback(() => {
    setUnsavedChangesOpen(false);
    setPendingTabId(null);
    setUnsavedTabId(null);
    setPendingSectionId(null);
    setPendingPanelAction(null);
    setUnsavedReason(null);
  }, []);

  const contextValue = useMemo(
    (): DashboardLayoutDesignerContextValue => ({
      editor,
      canSave,
      previewBreakpoint,
      setPreviewBreakpoint,
      previewMobileDeviceId,
      setPreviewMobileDeviceId,
      previewColorScheme,
      setPreviewColorScheme,
      activeTabId,
      sectionsIsDirty,
      layoutIsDirty,
      unsavedTabId,
      unsavedReason,
      saveSections,
      saveLayout,
      discardSections,
      discardLayout,
      requestTabChange,
      requestSectionChange,
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
      activeTabId,
      cancelUnsavedChanges,
      canSave,
      commitStructurePanelSave,
      confirmUnsavedDiscard,
      confirmUnsavedSave,
      discardLayout,
      discardSections,
      editor,
      layoutIsDirty,
      previewBreakpoint,
      previewColorScheme,
      previewMobileDeviceId,
      requestCloseStructurePanel,
      requestComponentColumnPanel,
      requestComponentRowPanel,
      requestTabChange,
      requestSectionChange,
      saveLayout,
      saveSections,
      sectionsIsDirty,
      selectedStructureColumnRef,
      selectedStructureRowRef,
      structurePanelIsDirty,
      structurePanelSession,
      unsavedChangesOpen,
      unsavedReason,
      unsavedTabId,
    ],
  );

  contextValueRef.current = contextValue;

  useEffect(() => {
    if (!structurePanelSession || !isThirdRailOpen) {
      return;
    }

    const latestContext = contextValueRef.current;
    if (!latestContext) {
      return;
    }

    updateThirdRail({
      title: structurePanelSession.label,
      ...renderDashboardLayoutStructurePanelChrome(
        latestContext,
        structurePanelSession,
      ),
    });
  }, [
    activeTabId,
    editor.dashboardLayout,
    editor.selectedSection?.layout,
    isThirdRailOpen,
    previewColorScheme,
    structurePanelIsDirty,
    structurePanelSession,
    updateThirdRail,
  ]);

  return (
    <DashboardLayoutDesignerContext.Provider value={contextValue}>
      {children}
    </DashboardLayoutDesignerContext.Provider>
  );
}
