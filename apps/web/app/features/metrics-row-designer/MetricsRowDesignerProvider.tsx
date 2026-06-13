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
import { useEntityMetricsWidgetsEditor } from "../ui-builder/use-entity-metrics-widgets-editor";
import { DEFAULT_MOBILE_PREVIEW_DEVICE_ID } from "../form-designer/mobile-preview-device-presets";
import type { MobilePreviewDeviceId } from "../form-designer/mobile-preview-device-presets";
import type { ComponentColumnRef } from "../form-designer/form-designer-component-column-ref";
import type { ComponentRowRef } from "../form-designer/form-designer-component-row-ref";
import {
  MetricsRowDesignerContext,
  type MetricsRowDesignerContextValue,
} from "./metrics-row-designer-context";
import {
  applyPanelSessionSnapshot,
  readPanelLayoutSnapshot,
} from "./metrics-row-designer-layout-binding";
import {
  areMetricsRowPanelTargetsEqual,
  isMetricsRowPanelSessionDirty,
  type MetricsRowPanelPendingAction,
  type MetricsRowPanelSession,
  type MetricsRowPanelTarget,
  type MetricsRowUnsavedReason,
} from "./metrics-row-designer-panel-session";
import { renderMetricsRowStructurePanelChrome } from "./metrics-row-designer-structure-panel-chrome";
import {
  applyRowLayoutSnapshotToEditor,
  applyWidgetsSnapshotToEditor,
  areRowLayoutSnapshotsEqual,
  areWidgetsSnapshotsEqual,
  readRowLayoutSnapshot,
  readRowLayoutSnapshotFromDefinition,
  readWidgetsSnapshot,
  readWidgetsSnapshotFromDefinition,
  type MetricsRowDesignerRowLayoutSnapshot,
  type MetricsRowDesignerWidgetsSnapshot,
} from "./metrics-row-designer-snapshots";
import {
  METRICS_ROW_DESIGNER_TAB_SEARCH_PARAM,
  isMetricsRowDesignerTabId,
  parseMetricsRowDesignerTabId,
  type MetricsRowDesignerTabId,
} from "./metrics-row-designer-tabs";

function shouldConfirmTabChange(
  fromTab: MetricsRowDesignerTabId,
  toTab: MetricsRowDesignerTabId,
  widgetsIsDirty: boolean,
  rowLayoutIsDirty: boolean,
): boolean {
  if (fromTab === toTab) {
    return false;
  }

  if (fromTab === "widgets" && widgetsIsDirty) {
    return true;
  }

  if (fromTab === "row" && rowLayoutIsDirty) {
    return true;
  }

  return false;
}

function applyTabToSearchParams(
  searchParams: URLSearchParams,
  tabId: MetricsRowDesignerTabId,
): URLSearchParams {
  const next = new URLSearchParams(searchParams);
  if (tabId === "widgets") {
    next.delete(METRICS_ROW_DESIGNER_TAB_SEARCH_PARAM);
  } else {
    next.set(METRICS_ROW_DESIGNER_TAB_SEARCH_PARAM, tabId);
  }
  return next;
}

interface MetricsRowDesignerProviderProps {
  readonly entityName: EntityName;
  readonly children: ReactNode;
}

export function MetricsRowDesignerProvider({
  entityName,
  children,
}: MetricsRowDesignerProviderProps) {
  const { t } = useTranslation("common");
  const editor = useEntityMetricsWidgetsEditor(entityName);
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

  const [savedWidgetsBaseline, setSavedWidgetsBaseline] =
    useState<MetricsRowDesignerWidgetsSnapshot>(() =>
      readWidgetsSnapshotFromDefinition(definition),
    );
  const [savedRowLayoutBaseline, setSavedRowLayoutBaseline] =
    useState<MetricsRowDesignerRowLayoutSnapshot>(() =>
      readRowLayoutSnapshotFromDefinition(definition),
    );

  const [unsavedChangesOpen, setUnsavedChangesOpen] = useState(false);
  const [pendingTabId, setPendingTabId] =
    useState<MetricsRowDesignerTabId | null>(null);
  const [unsavedTabId, setUnsavedTabId] =
    useState<MetricsRowDesignerTabId | null>(null);
  const [pendingWidgetId, setPendingWidgetId] = useState<string | null>(null);
  const [unsavedReason, setUnsavedReason] =
    useState<MetricsRowUnsavedReason | null>(null);
  const [pendingPanelAction, setPendingPanelAction] =
    useState<MetricsRowPanelPendingAction | null>(null);

  const [structurePanelSession, setStructurePanelSession] =
    useState<MetricsRowPanelSession | null>(null);
  const structurePanelSessionRef = useRef(structurePanelSession);
  structurePanelSessionRef.current = structurePanelSession;
  const editorRef = useRef(editor);
  editorRef.current = editor;
  const contextValueRef = useRef<MetricsRowDesignerContextValue | null>(null);

  const activeTabId = useMemo(
    () =>
      parseMetricsRowDesignerTabId(
        searchParams.get(METRICS_ROW_DESIGNER_TAB_SEARCH_PARAM),
      ),
    [searchParams],
  );
  const activeTabIdRef = useRef(activeTabId);
  activeTabIdRef.current = activeTabId;

  const currentWidgetsSnapshot = useMemo(
    () => readWidgetsSnapshot(editor),
    [editor],
  );

  const widgetsIsDirty = useMemo(
    () =>
      !areWidgetsSnapshotsEqual(savedWidgetsBaseline, currentWidgetsSnapshot),
    [currentWidgetsSnapshot, savedWidgetsBaseline],
  );

  const currentRowLayoutSnapshot = useMemo(
    () => readRowLayoutSnapshot(editor),
    [editor],
  );

  const rowLayoutIsDirty = useMemo(
    () =>
      !areRowLayoutSnapshotsEqual(
        savedRowLayoutBaseline,
        currentRowLayoutSnapshot,
      ),
    [currentRowLayoutSnapshot, savedRowLayoutBaseline],
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

    return isMetricsRowPanelSessionDirty(
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
    const currentEditor = editorRef.current;
    setSavedWidgetsBaseline(readWidgetsSnapshot(currentEditor));
    setSavedRowLayoutBaseline(readRowLayoutSnapshot(currentEditor));
  }, []);

  useEffect(() => {
    setSavedWidgetsBaseline(readWidgetsSnapshotFromDefinition(definition));
    if (definition.ui.metricRowLayout !== undefined) {
      setSavedRowLayoutBaseline(
        readRowLayoutSnapshotFromDefinition(definition),
      );
    }
  }, [definition]);

  const navigateToTab = useCallback(
    (tabId: MetricsRowDesignerTabId) => {
      setSearchParams((current) => applyTabToSearchParams(current, tabId), {
        replace: true,
      });
    },
    [setSearchParams],
  );

  const saveChanges = useCallback(async (): Promise<string | null> => {
    const ok = await editor.save();
    if (ok) {
      syncSavedBaselinesAfterSave();
      return null;
    }
    return t("entity.viewSettings.saveFailed");
  }, [editor, syncSavedBaselinesAfterSave, t]);

  const saveWidgets = saveChanges;
  const saveRow = saveChanges;

  const discardWidgets = useCallback(() => {
    applyWidgetsSnapshotToEditor(editor, savedWidgetsBaseline);
  }, [editor, savedWidgetsBaseline]);

  const discardRowLayout = useCallback(() => {
    applyRowLayoutSnapshotToEditor(editor, savedRowLayoutBaseline);
  }, [editor, savedRowLayoutBaseline]);

  const switchWidget = useCallback(
    (widgetId: string) => {
      editor.setSelectedWidgetId(widgetId);
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
    if (tabId === "widgets" && !currentEditor.selectedWidget) {
      return;
    }

    const current = readPanelLayoutSnapshot(currentEditor, tabId);
    if (isMetricsRowPanelSessionDirty(session, current)) {
      setPendingPanelAction({ type: "close" });
      setUnsavedReason("structurePanel");
      setUnsavedChangesOpen(true);
      return false;
    }

    setStructurePanelSession(null);
  }, []);

  const openStructurePanelAt = useCallback(
    (target: MetricsRowPanelTarget, label: string) => {
      const currentEditor = editorRef.current;
      const baseline = readPanelLayoutSnapshot(
        currentEditor,
        activeTabIdRef.current,
      );
      const session: MetricsRowPanelSession = {
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
        ...renderMetricsRowStructurePanelChrome(contextValue, session),
        resizeContent: true,
        onClose: guardStructurePanelClose,
      });
    },
    [guardStructurePanelClose, openThirdRail],
  );

  const switchStructurePanel = useCallback(
    (target: MetricsRowPanelTarget, label: string) => {
      const currentEditor = editorRef.current;
      const baseline = readPanelLayoutSnapshot(
        currentEditor,
        activeTabIdRef.current,
      );
      const session: MetricsRowPanelSession = {
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
        ...renderMetricsRowStructurePanelChrome(contextValue, session),
      });
    },
    [updateThirdRail],
  );

  const executePendingPanelAction = useCallback(
    (action: MetricsRowPanelPendingAction) => {
      if (action.type === "close") {
        closeStructurePanel();
        return;
      }

      switchStructurePanel(action.target, action.label);
    },
    [closeStructurePanel, switchStructurePanel],
  );

  const requestStructurePanel = useCallback(
    (target: MetricsRowPanelTarget, label: string) => {
      if (!structurePanelSession) {
        openStructurePanelAt(target, label);
        return;
      }

      if (
        areMetricsRowPanelTargetsEqual(structurePanelSession.target, target)
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

    const savedSession: MetricsRowPanelSession = {
      ...structurePanelSession,
      baseline: currentPanelLayoutSnapshot,
    };
    structurePanelSessionRef.current = savedSession;
    setStructurePanelSession(savedSession);
    closeStructurePanel();
  }, [closeStructurePanel, currentPanelLayoutSnapshot, structurePanelSession]);

  const requestTabChange = useCallback(
    (tabId: MetricsRowDesignerTabId) => {
      if (!isMetricsRowDesignerTabId(tabId) || tabId === activeTabId) {
        return;
      }

      if (
        shouldConfirmTabChange(
          activeTabId,
          tabId,
          widgetsIsDirty,
          rowLayoutIsDirty,
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
      rowLayoutIsDirty,
      structurePanelSession,
      widgetsIsDirty,
    ],
  );

  const requestWidgetChange = useCallback(
    (widgetId: string) => {
      if (widgetId === editor.selectedWidgetId) {
        return;
      }

      if (widgetsIsDirty || structurePanelIsDirty) {
        setPendingWidgetId(widgetId);
        setUnsavedReason("widget");
        setUnsavedChangesOpen(true);
        return;
      }

      if (structurePanelSession) {
        closeStructurePanel();
      }

      switchWidget(widgetId);
    },
    [
      closeStructurePanel,
      editor.selectedWidgetId,
      structurePanelIsDirty,
      structurePanelSession,
      switchWidget,
      widgetsIsDirty,
    ],
  );

  const confirmUnsavedSave = useCallback(async () => {
    if (unsavedReason === "structurePanel") {
      const action = pendingPanelAction;
      if (!action || !structurePanelSession || !currentPanelLayoutSnapshot) {
        setUnsavedChangesOpen(false);
        return;
      }

      const savedSession: MetricsRowPanelSession = {
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

    if (unsavedReason === "widget") {
      const nextWidgetId = pendingWidgetId;
      if (!nextWidgetId) {
        return;
      }

      const error = await saveWidgets();
      if (error) {
        return;
      }

      setUnsavedChangesOpen(false);
      setPendingWidgetId(null);
      setUnsavedReason(null);
      if (structurePanelSession) {
        closeStructurePanel();
      }
      switchWidget(nextWidgetId);
      return;
    }

    const tabId = unsavedTabId;
    const nextTabId = pendingTabId;
    if (!tabId || !nextTabId) {
      return;
    }

    const error = await saveWidgets();
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
    pendingWidgetId,
    saveWidgets,
    structurePanelSession,
    switchWidget,
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

    if (unsavedReason === "widget") {
      const nextWidgetId = pendingWidgetId;
      if (!nextWidgetId) {
        return;
      }

      discardWidgets();
      setUnsavedChangesOpen(false);
      setPendingWidgetId(null);
      setUnsavedReason(null);
      if (structurePanelSession) {
        closeStructurePanel();
      }
      switchWidget(nextWidgetId);
      return;
    }

    const tabId = unsavedTabId;
    const nextTabId = pendingTabId;
    if (!tabId || !nextTabId) {
      return;
    }

    if (tabId === "widgets") {
      discardWidgets();
    } else {
      discardRowLayout();
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
    discardRowLayout,
    discardWidgets,
    editor,
    executePendingPanelAction,
    navigateToTab,
    pendingPanelAction,
    pendingTabId,
    pendingWidgetId,
    structurePanelSession,
    switchWidget,
    unsavedReason,
    unsavedTabId,
  ]);

  const cancelUnsavedChanges = useCallback(() => {
    setUnsavedChangesOpen(false);
    setPendingTabId(null);
    setUnsavedTabId(null);
    setPendingWidgetId(null);
    setPendingPanelAction(null);
    setUnsavedReason(null);
  }, []);

  const contextValue = useMemo(
    (): MetricsRowDesignerContextValue => ({
      editor,
      canSave,
      previewBreakpoint,
      setPreviewBreakpoint,
      previewMobileDeviceId,
      setPreviewMobileDeviceId,
      previewColorScheme,
      setPreviewColorScheme,
      activeTabId,
      widgetsIsDirty,
      rowLayoutIsDirty,
      unsavedTabId,
      unsavedReason,
      saveWidgets,
      saveRow,
      discardWidgets,
      discardRowLayout,
      requestTabChange,
      requestWidgetChange,
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
      discardRowLayout,
      discardWidgets,
      editor,
      rowLayoutIsDirty,
      previewBreakpoint,
      previewColorScheme,
      previewMobileDeviceId,
      requestCloseStructurePanel,
      requestComponentColumnPanel,
      requestComponentRowPanel,
      requestTabChange,
      requestWidgetChange,
      saveRow,
      saveWidgets,
      widgetsIsDirty,
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
      ...renderMetricsRowStructurePanelChrome(
        latestContext,
        structurePanelSession,
      ),
    });
  }, [
    activeTabId,
    editor.metricRowLayout,
    editor.selectedWidget?.layout,
    isThirdRailOpen,
    previewColorScheme,
    structurePanelIsDirty,
    structurePanelSession,
    updateThirdRail,
  ]);

  return (
    <MetricsRowDesignerContext.Provider value={contextValue}>
      {children}
    </MetricsRowDesignerContext.Provider>
  );
}
