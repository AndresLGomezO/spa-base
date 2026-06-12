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
import { useEntityRecordDetailLayoutEditor } from "../ui-builder/use-entity-record-detail-layout-editor";
import { DEFAULT_MOBILE_PREVIEW_DEVICE_ID } from "../form-designer/mobile-preview-device-presets";
import type { MobilePreviewDeviceId } from "../form-designer/mobile-preview-device-presets";
import type { ComponentColumnRef } from "../form-designer/form-designer-component-column-ref";
import type { ComponentRowRef } from "../form-designer/form-designer-component-row-ref";
import {
  DetailViewDesignerContext,
  type DetailViewDesignerContextValue,
} from "./detail-view-designer-context";
import {
  applyPanelSessionSnapshot,
  readLayoutSnapshot as readPanelLayoutSnapshot,
} from "./detail-view-designer-layout-binding";
import {
  areDetailViewPanelTargetsEqual,
  isDetailViewPanelSessionDirty,
  type DetailViewPanelPendingAction,
  type DetailViewPanelSession,
  type DetailViewPanelTarget,
  type DetailViewUnsavedReason,
} from "./detail-view-designer-panel-session";
import { renderDetailViewStructurePanelChrome } from "./detail-view-designer-structure-panel-chrome";
import {
  applyLayoutSnapshotToEditor,
  areLayoutSnapshotsEqual,
  readLayoutSnapshot,
  readLayoutSnapshotFromDefinition,
  type DetailViewDesignerLayoutSnapshot,
} from "./detail-view-designer-snapshots";
import {
  MAIN_VIEW_DESIGNER_TAB_SEARCH_PARAM,
  isDetailViewDesignerTabId,
  parseDetailViewDesignerTabId,
  type DetailViewDesignerTabId,
} from "./detail-view-designer-tabs";

function shouldConfirmTabChange(
  fromTab: DetailViewDesignerTabId,
  toTab: DetailViewDesignerTabId,
  layoutIsDirty: boolean,
): boolean {
  return fromTab !== toTab && fromTab === "layout" && layoutIsDirty;
}

function applyTabToSearchParams(
  searchParams: URLSearchParams,
  tabId: DetailViewDesignerTabId,
): URLSearchParams {
  const next = new URLSearchParams(searchParams);
  if (tabId === "settings") {
    next.delete(MAIN_VIEW_DESIGNER_TAB_SEARCH_PARAM);
  } else {
    next.set(MAIN_VIEW_DESIGNER_TAB_SEARCH_PARAM, tabId);
  }
  return next;
}

interface DetailViewDesignerProviderProps {
  readonly entityName: EntityName;
  readonly children: ReactNode;
}

export function DetailViewDesignerProvider({
  entityName,
  children,
}: DetailViewDesignerProviderProps) {
  const { t } = useTranslation("common");
  const editor = useEntityRecordDetailLayoutEditor(entityName);
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
    useState<DetailViewDesignerLayoutSnapshot>(() =>
      readLayoutSnapshotFromDefinition(definition, editor),
    );

  const [unsavedChangesOpen, setUnsavedChangesOpen] = useState(false);
  const [pendingTabId, setPendingTabId] =
    useState<DetailViewDesignerTabId | null>(null);
  const [unsavedTabId, setUnsavedTabId] =
    useState<DetailViewDesignerTabId | null>(null);
  const [unsavedReason, setUnsavedReason] =
    useState<DetailViewUnsavedReason | null>(null);
  const [pendingPanelAction, setPendingPanelAction] =
    useState<DetailViewPanelPendingAction | null>(null);

  const [structurePanelSession, setStructurePanelSession] =
    useState<DetailViewPanelSession | null>(null);
  const structurePanelSessionRef = useRef(structurePanelSession);
  structurePanelSessionRef.current = structurePanelSession;
  const editorRef = useRef(editor);
  editorRef.current = editor;
  const contextValueRef = useRef<DetailViewDesignerContextValue | null>(null);

  const activeTabId = useMemo(
    () =>
      parseDetailViewDesignerTabId(
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

    return isDetailViewPanelSessionDirty(
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
    setSavedLayoutBaseline(readLayoutSnapshot(editorRef.current));
  }, [editor.layoutSyncGeneration]);

  const navigateToTab = useCallback(
    (tabId: DetailViewDesignerTabId) => {
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
    if (isDetailViewPanelSessionDirty(session, current)) {
      setPendingPanelAction({ type: "close" });
      setUnsavedReason("structurePanel");
      setUnsavedChangesOpen(true);
      return false;
    }

    setStructurePanelSession(null);
  }, []);

  const openStructurePanelAt = useCallback(
    (target: DetailViewPanelTarget, label: string) => {
      const currentEditor = editorRef.current;
      const baseline = readPanelLayoutSnapshot(currentEditor);
      const session: DetailViewPanelSession = {
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
        ...renderDetailViewStructurePanelChrome(contextValue, session),
        resizeContent: true,
        onClose: guardStructurePanelClose,
      });
    },
    [guardStructurePanelClose, openThirdRail],
  );

  const switchStructurePanel = useCallback(
    (target: DetailViewPanelTarget, label: string) => {
      const currentEditor = editorRef.current;
      const baseline = readPanelLayoutSnapshot(currentEditor);
      const session: DetailViewPanelSession = {
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
        ...renderDetailViewStructurePanelChrome(contextValue, session),
      });
    },
    [updateThirdRail],
  );

  const executePendingPanelAction = useCallback(
    (action: DetailViewPanelPendingAction) => {
      if (action.type === "close") {
        closeStructurePanel();
        return;
      }

      switchStructurePanel(action.target, action.label);
    },
    [closeStructurePanel, switchStructurePanel],
  );

  const requestStructurePanel = useCallback(
    (target: DetailViewPanelTarget, label: string) => {
      if (!structurePanelSession) {
        openStructurePanelAt(target, label);
        return;
      }

      if (
        areDetailViewPanelTargetsEqual(structurePanelSession.target, target)
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

    const savedSession: DetailViewPanelSession = {
      ...structurePanelSession,
      baseline: currentPanelLayoutSnapshot,
    };
    structurePanelSessionRef.current = savedSession;
    setStructurePanelSession(savedSession);
    closeStructurePanel();
  }, [closeStructurePanel, currentPanelLayoutSnapshot, structurePanelSession]);

  const requestTabChange = useCallback(
    (tabId: DetailViewDesignerTabId) => {
      if (!isDetailViewDesignerTabId(tabId) || tabId === activeTabId) {
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

      const savedSession: DetailViewPanelSession = {
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
    (): DetailViewDesignerContextValue => ({
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
      ...renderDetailViewStructurePanelChrome(
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
    <DetailViewDesignerContext.Provider value={contextValue}>
      {children}
    </DetailViewDesignerContext.Provider>
  );
}
