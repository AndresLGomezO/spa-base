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
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import { useColorScheme } from "@repo/theme/react";

import { useAnyPermission } from "../../auth/useAnyPermission";
import type { EntityName } from "../../entities/entity-catalog";
import { useEntityDefinition } from "../../entities/entity-catalog-context";
import {
  DEFAULT_LAYOUT_PREVIEW_BREAKPOINT,
  type LayoutPreviewBreakpoint,
} from "../ui-builder/LayoutPreviewPanel";
import { useEntityMainPageLayoutEditor } from "../ui-builder/use-entity-main-page-layout-editor";
import { DEFAULT_MOBILE_PREVIEW_DEVICE_ID } from "../form-designer/mobile-preview-device-presets";
import type { MobilePreviewDeviceId } from "../form-designer/mobile-preview-device-presets";
import type { ComponentColumnRef } from "../form-designer/form-designer-component-column-ref";
import type { ComponentRowRef } from "../form-designer/form-designer-component-row-ref";
import {
  MainViewDesignerContext,
  type MainViewDesignerContextValue,
} from "./main-view-designer-context";
import {
  applyPanelSessionSnapshot,
  readLayoutSnapshot as readPanelLayoutSnapshot,
} from "./main-view-designer-layout-binding";
import {
  areMainViewPanelTargetsEqual,
  isMainViewPanelSessionDirty,
  type MainViewPanelPendingAction,
  type MainViewPanelSession,
  type MainViewPanelTarget,
  type MainViewUnsavedReason,
} from "./main-view-designer-panel-session";
import { renderMainViewStructurePanelChrome } from "./main-view-designer-structure-panel-chrome";
import {
  applyLayoutSnapshotToEditor,
  areLayoutSnapshotsEqual,
  readLayoutSnapshot,
  readLayoutSnapshotFromDefinition,
  type MainViewDesignerLayoutSnapshot,
} from "./main-view-designer-snapshots";
import {
  MAIN_VIEW_DESIGNER_TAB_SEARCH_PARAM,
  isMainViewDesignerTabId,
  parseMainViewDesignerTabId,
  type MainViewDesignerTabId,
} from "./main-view-designer-tabs";

function shouldConfirmTabChange(
  fromTab: MainViewDesignerTabId,
  toTab: MainViewDesignerTabId,
  layoutIsDirty: boolean,
): boolean {
  return fromTab !== toTab && fromTab === "layout" && layoutIsDirty;
}

function applyTabToSearchParams(
  searchParams: URLSearchParams,
  tabId: MainViewDesignerTabId,
): URLSearchParams {
  const next = new URLSearchParams(searchParams);
  if (tabId === "settings") {
    next.delete(MAIN_VIEW_DESIGNER_TAB_SEARCH_PARAM);
  } else {
    next.set(MAIN_VIEW_DESIGNER_TAB_SEARCH_PARAM, tabId);
  }
  return next;
}

interface MainViewDesignerProviderProps {
  readonly entityName: EntityName;
  readonly children: ReactNode;
}

export function MainViewDesignerProvider({
  entityName,
  children,
}: MainViewDesignerProviderProps) {
  const { t } = useTranslation("common");
  const editor = useEntityMainPageLayoutEditor(entityName);
  const definition = useEntityDefinition(entityName);
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

  const [savedLayoutBaseline, setSavedLayoutBaseline] =
    useState<MainViewDesignerLayoutSnapshot>(() =>
      readLayoutSnapshotFromDefinition(definition, editor),
    );

  const [unsavedChangesOpen, setUnsavedChangesOpen] = useState(false);
  const [pendingTabId, setPendingTabId] =
    useState<MainViewDesignerTabId | null>(null);
  const [unsavedTabId, setUnsavedTabId] =
    useState<MainViewDesignerTabId | null>(null);
  const [unsavedReason, setUnsavedReason] =
    useState<MainViewUnsavedReason | null>(null);
  const [pendingPanelAction, setPendingPanelAction] =
    useState<MainViewPanelPendingAction | null>(null);

  const [structurePanelSession, setStructurePanelSession] =
    useState<MainViewPanelSession | null>(null);
  const structurePanelSessionRef = useRef(structurePanelSession);
  structurePanelSessionRef.current = structurePanelSession;
  const editorRef = useRef(editor);
  editorRef.current = editor;
  const contextValueRef = useRef<MainViewDesignerContextValue | null>(null);

  const activeTabId = useMemo(
    () =>
      parseMainViewDesignerTabId(
        searchParams.get(MAIN_VIEW_DESIGNER_TAB_SEARCH_PARAM),
      ),
    [searchParams],
  );

  const currentLayoutSnapshot = useMemo(
    () => readLayoutSnapshot({ layout: editor.layout }),
    [editor.layout],
  );

  const layoutIsDirty = useMemo(
    () => !areLayoutSnapshotsEqual(savedLayoutBaseline, currentLayoutSnapshot),
    [currentLayoutSnapshot, savedLayoutBaseline],
  );

  const currentPanelLayoutSnapshot = useMemo(() => {
    if (!structurePanelSession) {
      return null;
    }

    return readPanelLayoutSnapshot({ layout: editor.layout });
  }, [editor.layout, structurePanelSession]);

  const structurePanelIsDirty = useMemo(() => {
    if (!structurePanelSession || !currentPanelLayoutSnapshot) {
      return false;
    }

    return isMainViewPanelSessionDirty(
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

  const syncSavedBaselinesAfterSave = useCallback(() => {
    setSavedLayoutBaseline(readLayoutSnapshot(editorRef.current));
  }, []);

  useEffect(() => {
    const currentEditor = editorRef.current;
    setSavedLayoutBaseline(
      readLayoutSnapshotFromDefinition(definition, currentEditor),
    );
  }, [definition]);

  const navigateToTab = useCallback(
    (tabId: MainViewDesignerTabId) => {
      setSearchParams((current) => applyTabToSearchParams(current, tabId), {
        replace: true,
      });
    },
    [setSearchParams],
  );

  const saveLayout = useCallback(async (): Promise<string | null> => {
    const ok = await editor.save();
    if (ok) {
      syncSavedBaselinesAfterSave();
      return null;
    }
    return t("entity.viewSettings.saveFailed");
  }, [editor, syncSavedBaselinesAfterSave, t]);

  const discardLayout = useCallback(() => {
    applyLayoutSnapshotToEditor(editor, savedLayoutBaseline);
  }, [editor, savedLayoutBaseline]);

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

    const current = readPanelLayoutSnapshot(editorRef.current);
    if (isMainViewPanelSessionDirty(session, current)) {
      setPendingPanelAction({ type: "close" });
      setUnsavedReason("structurePanel");
      setUnsavedChangesOpen(true);
      return false;
    }

    setStructurePanelSession(null);
  }, []);

  const openStructurePanelAt = useCallback(
    (target: MainViewPanelTarget, label: string) => {
      const currentEditor = editorRef.current;
      const baseline = readPanelLayoutSnapshot(currentEditor);
      const session: MainViewPanelSession = {
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
        ...renderMainViewStructurePanelChrome(contextValue, session),
        resizeContent: true,
        onClose: guardStructurePanelClose,
      });
    },
    [guardStructurePanelClose, openThirdRail],
  );

  const switchStructurePanel = useCallback(
    (target: MainViewPanelTarget, label: string) => {
      const currentEditor = editorRef.current;
      const baseline = readPanelLayoutSnapshot(currentEditor);
      const session: MainViewPanelSession = {
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
        ...renderMainViewStructurePanelChrome(contextValue, session),
      });
    },
    [updateThirdRail],
  );

  const executePendingPanelAction = useCallback(
    (action: MainViewPanelPendingAction) => {
      if (action.type === "close") {
        closeStructurePanel();
        return;
      }

      switchStructurePanel(action.target, action.label);
    },
    [closeStructurePanel, switchStructurePanel],
  );

  const requestStructurePanel = useCallback(
    (target: MainViewPanelTarget, label: string) => {
      if (!structurePanelSession) {
        openStructurePanelAt(target, label);
        return;
      }

      if (areMainViewPanelTargetsEqual(structurePanelSession.target, target)) {
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

    const savedSession: MainViewPanelSession = {
      ...structurePanelSession,
      baseline: currentPanelLayoutSnapshot,
    };
    structurePanelSessionRef.current = savedSession;
    setStructurePanelSession(savedSession);
    closeStructurePanel();
  }, [closeStructurePanel, currentPanelLayoutSnapshot, structurePanelSession]);

  const requestTabChange = useCallback(
    (tabId: MainViewDesignerTabId) => {
      if (!isMainViewDesignerTabId(tabId) || tabId === activeTabId) {
        return;
      }

      if (shouldConfirmTabChange(activeTabId, tabId, layoutIsDirty)) {
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
      layoutIsDirty,
      navigateToTab,
      structurePanelSession,
    ],
  );

  const confirmUnsavedSave = useCallback(async () => {
    if (unsavedReason === "structurePanel") {
      const action = pendingPanelAction;
      if (!action || !structurePanelSession || !currentPanelLayoutSnapshot) {
        setUnsavedChangesOpen(false);
        return;
      }

      const savedSession: MainViewPanelSession = {
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

    const tabId = unsavedTabId;
    const nextTabId = pendingTabId;
    if (!tabId || !nextTabId) {
      return;
    }

    const error = await saveLayout();
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
    saveLayout,
    structurePanelSession,
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

      applyPanelSessionSnapshot(editor, session);
      setUnsavedChangesOpen(false);
      setPendingPanelAction(null);
      setUnsavedReason(null);
      executePendingPanelAction(action);
      return;
    }

    const tabId = unsavedTabId;
    const nextTabId = pendingTabId;
    if (!tabId || !nextTabId) {
      return;
    }

    discardLayout();

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
    discardLayout,
    editor,
    executePendingPanelAction,
    navigateToTab,
    pendingPanelAction,
    pendingTabId,
    structurePanelSession,
    unsavedReason,
    unsavedTabId,
  ]);

  const cancelUnsavedChanges = useCallback(() => {
    setUnsavedChangesOpen(false);
    setPendingTabId(null);
    setUnsavedTabId(null);
    setPendingPanelAction(null);
    setUnsavedReason(null);
  }, []);

  const contextValue = useMemo(
    (): MainViewDesignerContextValue => ({
      editor,
      canSave,
      previewBreakpoint,
      setPreviewBreakpoint,
      previewMobileDeviceId,
      setPreviewMobileDeviceId,
      previewColorScheme,
      setPreviewColorScheme,
      activeTabId,
      settingsIsDirty: false,
      layoutIsDirty,
      unsavedTabId,
      unsavedReason,
      saveLayout,
      discardLayout,
      requestTabChange,
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
      editor,
      layoutIsDirty,
      previewBreakpoint,
      previewColorScheme,
      previewMobileDeviceId,
      requestCloseStructurePanel,
      requestComponentColumnPanel,
      requestComponentRowPanel,
      requestTabChange,
      saveLayout,
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
      ...renderMainViewStructurePanelChrome(
        latestContext,
        structurePanelSession,
      ),
    });
  }, [
    editor.layout,
    isThirdRailOpen,
    previewColorScheme,
    structurePanelIsDirty,
    structurePanelSession,
    updateThirdRail,
  ]);

  return (
    <MainViewDesignerContext.Provider value={contextValue}>
      {children}
    </MainViewDesignerContext.Provider>
  );
}
