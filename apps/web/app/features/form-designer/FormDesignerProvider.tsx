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
import {
  useEntityFormLayoutEditor,
  resolvePresentationFromLayoutPresetId,
} from "../ui-builder/use-entity-form-layout-editor";
import {
  applyLayoutSnapshotToEditor,
  areLayoutSnapshotsEqual,
  readLayoutSnapshot,
  readLayoutSnapshotFromDefinition,
  type FormDesignerLayoutSnapshot,
} from "./form-designer-layout";
import {
  applyComponentsTreeSnapshotToEditor,
  readComponentsTreeSnapshot,
  type FormDesignerComponentsTreeSnapshot,
} from "./form-designer-components";
import {
  applySettingsSnapshotToEditor,
  areSettingsSnapshotsEqual,
  readSettingsSnapshot,
  readSettingsSnapshotFromDefinition,
  type FormDesignerSettingsSnapshot,
} from "./form-designer-settings";
import {
  FORM_DESIGNER_TAB_SEARCH_PARAM,
  isFormDesignerTabId,
  parseFormDesignerTabId,
  type FormDesignerTabId,
} from "./form-designer-tabs";
import { useFormDesignerPreview } from "./use-form-designer-preview";
import {
  type ColumnPanelPendingAction,
  type FormDesignerUnsavedReason,
  type RootLayoutPanelPendingAction,
  type RootLayoutPanelSession,
  isColumnPanelDirty,
} from "./form-designer-column-panel-session";
import type { ComponentColumnRef } from "./form-designer-component-column-ref";
import type { ComponentRowRef } from "./form-designer-component-row-ref";
import {
  applyScopedLayoutSnapshot,
  readScopedLayoutSnapshot,
  type ComponentsTreeScope,
} from "./form-designer-components-layout";
import {
  FormDesignerContext,
  type FormDesignerContextValue,
} from "./form-designer-context";
import {
  areComponentPanelTargetsEqual,
  type ComponentPanelTarget,
  type ComponentRowPanelPendingAction,
  type ComponentRowPanelSession,
  isComponentRowPanelDirty,
} from "./form-designer-component-row-panel-session";
import { formDesignerComponentPanelThirdRail } from "./form-designer-component-panel-third-rail";
import {
  formDesignerLayoutColumnThirdRail,
  formDesignerRootLayoutThirdRail,
} from "./form-designer-layout-third-rail";
import {
  DEFAULT_MOBILE_PREVIEW_DEVICE_ID,
  type MobilePreviewDeviceId,
} from "./mobile-preview-device-presets";

const FormDesignerComponentPanelThirdRailHeaderActions =
  formDesignerComponentPanelThirdRail.HeaderActions;
const FormDesignerComponentPanelThirdRailBody =
  formDesignerComponentPanelThirdRail.Body;
const FormDesignerComponentPanelThirdRailFooter =
  formDesignerComponentPanelThirdRail.Footer;

const FormDesignerLayoutColumnThirdRailHeaderActions =
  formDesignerLayoutColumnThirdRail.HeaderActions;
const FormDesignerLayoutColumnThirdRailBody =
  formDesignerLayoutColumnThirdRail.Body;
const FormDesignerLayoutColumnThirdRailFooter =
  formDesignerLayoutColumnThirdRail.Footer;

const FormDesignerRootLayoutThirdRailBody =
  formDesignerRootLayoutThirdRail.Body;
const FormDesignerRootLayoutThirdRailFooter =
  formDesignerRootLayoutThirdRail.Footer;

function isTabDirty(
  tabId: FormDesignerTabId,
  settingsIsDirty: boolean,
  layoutIsDirty: boolean,
  componentsIsDirty: boolean,
): boolean {
  if (tabId === "settings") {
    return settingsIsDirty;
  }
  if (tabId === "design") {
    return layoutIsDirty || componentsIsDirty;
  }
  return false;
}

function shouldBlockTabChange(
  fromTab: FormDesignerTabId,
  toTab: FormDesignerTabId,
  settingsIsDirty: boolean,
  layoutIsDirty: boolean,
  componentsIsDirty: boolean,
): boolean {
  return (
    fromTab !== toTab &&
    isTabDirty(fromTab, settingsIsDirty, layoutIsDirty, componentsIsDirty)
  );
}

function applyTabToSearchParams(
  searchParams: URLSearchParams,
  tabId: FormDesignerTabId,
): URLSearchParams {
  const next = new URLSearchParams(searchParams);
  if (tabId === "settings") {
    next.delete(FORM_DESIGNER_TAB_SEARCH_PARAM);
  } else {
    next.set(FORM_DESIGNER_TAB_SEARCH_PARAM, tabId);
  }
  return next;
}

interface FormDesignerProviderProps {
  readonly entityName: EntityName;
  readonly formDesignId?: string;
  readonly children: ReactNode;
}

export function FormDesignerProvider({
  entityName,
  formDesignId,
  children,
}: FormDesignerProviderProps) {
  const { t } = useTranslation("common");
  const {
    open: openThirdRail,
    close: closeThirdRail,
    update: updateThirdRail,
  } = useThirdRail();
  const editor = useEntityFormLayoutEditor(entityName, { formDesignId });
  const definition = useEntityDefinition(entityName);
  const canSave = useAnyPermission(ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS);
  const [searchParams, setSearchParams] = useSearchParams();
  const { colorScheme: appColorScheme } = useColorScheme();
  const [previewBreakpoint, setPreviewBreakpoint] =
    useState<LayoutPreviewBreakpoint>(DEFAULT_LAYOUT_PREVIEW_BREAKPOINT);
  const preview = useFormDesignerPreview(editor, previewBreakpoint);
  const [previewMobileDeviceId, setPreviewMobileDeviceId] =
    useState<MobilePreviewDeviceId>(DEFAULT_MOBILE_PREVIEW_DEVICE_ID);
  const [previewColorScheme, setPreviewColorScheme] = useState(appColorScheme);
  const [savedSettingsBaseline, setSavedSettingsBaseline] =
    useState<FormDesignerSettingsSnapshot>(() =>
      readSettingsSnapshotFromDefinition(definition),
    );
  const [savedLayoutBaseline, setSavedLayoutBaseline] =
    useState<FormDesignerLayoutSnapshot>(() =>
      readLayoutSnapshotFromDefinition(
        definition,
        resolvePresentationFromLayoutPresetId(
          readSettingsSnapshotFromDefinition(definition).layoutPresetId,
        ),
      ),
    );
  const [componentsSessionTreeBaseline, setComponentsSessionTreeBaseline] =
    useState<FormDesignerComponentsTreeSnapshot | null>(null);
  const [componentsSessionDirty, setComponentsSessionDirty] = useState(false);
  const [unsavedChangesOpen, setUnsavedChangesOpen] = useState(false);
  const [pendingTabId, setPendingTabId] = useState<FormDesignerTabId | null>(
    null,
  );
  const [unsavedTabId, setUnsavedTabId] = useState<FormDesignerTabId | null>(
    null,
  );
  const [unsavedReason, setUnsavedReason] =
    useState<FormDesignerUnsavedReason | null>(null);
  const [pendingColumnAction, setPendingColumnAction] =
    useState<ColumnPanelPendingAction | null>(null);
  const [pendingRootLayoutAction, setPendingRootLayoutAction] =
    useState<RootLayoutPanelPendingAction | null>(null);
  const [columnPanelSession, setColumnPanelSession] = useState<{
    readonly columnIndex: number;
    readonly baseline: FormDesignerLayoutSnapshot;
  } | null>(null);
  const [rootLayoutPanelSession, setRootLayoutPanelSession] =
    useState<RootLayoutPanelSession | null>(null);
  const [overlayPreviewOpen, setOverlayPreviewOpen] = useState(false);
  const [componentRowPanelSession, setComponentRowPanelSession] =
    useState<ComponentRowPanelSession | null>(null);
  const [pendingComponentRowAction, setPendingComponentRowAction] =
    useState<ComponentRowPanelPendingAction | null>(null);
  const columnPanelSessionRef = useRef(columnPanelSession);
  const rootLayoutPanelSessionRef = useRef(rootLayoutPanelSession);
  const componentRowPanelSessionRef = useRef(componentRowPanelSession);
  columnPanelSessionRef.current = columnPanelSession;
  rootLayoutPanelSessionRef.current = rootLayoutPanelSession;
  componentRowPanelSessionRef.current = componentRowPanelSession;
  const editorRef = useRef(editor);
  editorRef.current = editor;
  const contextValueRef = useRef<FormDesignerContextValue | null>(null);
  const previousTabIdRef = useRef<FormDesignerTabId | null>(null);

  const activeTabId = useMemo(
    () =>
      parseFormDesignerTabId(searchParams.get(FORM_DESIGNER_TAB_SEARCH_PARAM)),
    [searchParams],
  );

  useEffect(() => {
    const settingsBaseline = readSettingsSnapshotFromDefinition(definition);
    setSavedSettingsBaseline(settingsBaseline);
    setSavedLayoutBaseline(
      readLayoutSnapshotFromDefinition(
        definition,
        resolvePresentationFromLayoutPresetId(settingsBaseline.layoutPresetId),
      ),
    );
  }, [definition]);

  useLayoutEffect(() => {
    const previousTabId = previousTabIdRef.current;
    if (activeTabId === "design" && previousTabId !== "design") {
      setComponentsSessionTreeBaseline(
        readComponentsTreeSnapshot(editorRef.current),
      );
      setComponentsSessionDirty(false);
    } else if (activeTabId !== "design" && previousTabId === "design") {
      setComponentsSessionTreeBaseline(null);
      setComponentsSessionDirty(false);
    }
    previousTabIdRef.current = activeTabId;
  }, [activeTabId]);

  const currentSettingsSnapshot = useMemo(
    () => readSettingsSnapshot(editor),
    [editor],
  );

  const currentLayoutSnapshot = useMemo(
    () =>
      readLayoutSnapshot(
        editor.presentation === "wizard"
          ? editor.wizard.shellLayout
          : editor.plainLayout,
      ),
    [editor.plainLayout, editor.presentation, editor.wizard.shellLayout],
  );

  const settingsIsDirty = useMemo(
    () =>
      !areSettingsSnapshotsEqual(
        savedSettingsBaseline,
        currentSettingsSnapshot,
      ),
    [currentSettingsSnapshot, savedSettingsBaseline],
  );

  const layoutIsDirty = useMemo(
    () => !areLayoutSnapshotsEqual(savedLayoutBaseline, currentLayoutSnapshot),
    [currentLayoutSnapshot, savedLayoutBaseline],
  );

  const componentsIsDirty = activeTabId === "design" && componentsSessionDirty;

  const markComponentsDirty = useCallback(() => {
    setComponentsSessionDirty(true);
  }, []);

  const columnPanelIsDirty = useMemo(() => {
    if (!columnPanelSession) {
      return false;
    }
    return isColumnPanelDirty(
      columnPanelSession.baseline,
      currentLayoutSnapshot,
    );
  }, [columnPanelSession, currentLayoutSnapshot]);

  const rootLayoutPanelOpen = rootLayoutPanelSession != null;

  const rootLayoutPanelIsDirty = useMemo(() => {
    if (!rootLayoutPanelSession) {
      return false;
    }
    return isColumnPanelDirty(
      rootLayoutPanelSession.baseline,
      currentLayoutSnapshot,
    );
  }, [rootLayoutPanelSession, currentLayoutSnapshot]);

  const currentScopedLayoutSnapshot = useMemo(() => {
    if (!componentRowPanelSession) {
      return null;
    }
    return readScopedLayoutSnapshot(
      {
        presentation: editor.presentation,
        plainLayout: editor.plainLayout,
        wizard: editor.wizard,
        modalFooterLayout: editor.modalFooterLayout,
      },
      componentRowPanelSession.treeScope,
      componentRowPanelSession.stepIndex,
    );
  }, [
    componentRowPanelSession,
    editor.modalFooterLayout,
    editor.plainLayout,
    editor.presentation,
    editor.wizard,
  ]);

  const componentRowPanelIsDirty = useMemo(() => {
    if (!componentRowPanelSession || !currentScopedLayoutSnapshot) {
      return false;
    }
    return isComponentRowPanelDirty(
      componentRowPanelSession.baseline,
      currentScopedLayoutSnapshot,
    );
  }, [componentRowPanelSession, currentScopedLayoutSnapshot]);

  const navigateToTab = useCallback(
    (tabId: FormDesignerTabId) => {
      setSearchParams(applyTabToSearchParams(searchParams, tabId), {
        replace: true,
      });
    },
    [searchParams, setSearchParams],
  );

  const syncSavedBaselinesAfterSave = useCallback(() => {
    setSavedSettingsBaseline(readSettingsSnapshot(editor));
    setSavedLayoutBaseline(
      readLayoutSnapshot(
        editor.presentation === "wizard"
          ? editor.wizard.shellLayout
          : editor.plainLayout,
      ),
    );
    setComponentsSessionTreeBaseline(readComponentsTreeSnapshot(editor));
    setComponentsSessionDirty(false);
  }, [editor]);

  const saveSettings = useCallback(async (): Promise<string | null> => {
    const error = await editor.save();
    if (!error) {
      syncSavedBaselinesAfterSave();
    }
    return error;
  }, [editor, syncSavedBaselinesAfterSave]);

  const discardSettings = useCallback(() => {
    applySettingsSnapshotToEditor(editor, savedSettingsBaseline);
  }, [editor, savedSettingsBaseline]);

  const saveLayout = useCallback(async (): Promise<string | null> => {
    const error = await editor.save();
    if (!error) {
      syncSavedBaselinesAfterSave();
    }
    return error;
  }, [editor, syncSavedBaselinesAfterSave]);

  const discardLayout = useCallback(() => {
    applyLayoutSnapshotToEditor(
      editor,
      savedLayoutBaseline,
      editor.presentation,
    );
  }, [editor, savedLayoutBaseline]);

  const saveComponents = useCallback(async (): Promise<string | null> => {
    const error = await editor.save();
    if (!error) {
      syncSavedBaselinesAfterSave();
    }
    return error;
  }, [editor, syncSavedBaselinesAfterSave]);

  const discardComponents = useCallback(() => {
    if (componentsSessionTreeBaseline == null) {
      return;
    }

    applyComponentsTreeSnapshotToEditor(editor, componentsSessionTreeBaseline);
    setComponentsSessionDirty(false);
  }, [componentsSessionTreeBaseline, editor]);

  const requestTabChange = useCallback(
    (tabId: FormDesignerTabId) => {
      if (!isFormDesignerTabId(tabId) || tabId === activeTabId) {
        return;
      }

      if (
        shouldBlockTabChange(
          activeTabId,
          tabId,
          settingsIsDirty,
          layoutIsDirty,
          componentsIsDirty,
        )
      ) {
        setPendingTabId(tabId);
        setUnsavedTabId(activeTabId);
        setUnsavedReason("tab");
        setUnsavedChangesOpen(true);
        return;
      }

      navigateToTab(tabId);
    },
    [
      activeTabId,
      componentsIsDirty,
      layoutIsDirty,
      navigateToTab,
      settingsIsDirty,
    ],
  );

  const closeColumnPanel = useCallback(() => {
    columnPanelSessionRef.current = null;
    setColumnPanelSession(null);
    closeThirdRail();
  }, [closeThirdRail]);

  const guardComponentRowPanelClose = useCallback((): void | boolean => {
    const session = componentRowPanelSessionRef.current;
    if (!session) {
      return;
    }
    const currentEditor = editorRef.current;
    const current = readScopedLayoutSnapshot(
      currentEditor,
      session.treeScope,
      session.stepIndex,
    );
    if (isComponentRowPanelDirty(session.baseline, current)) {
      setPendingComponentRowAction({ type: "close" });
      setUnsavedReason("componentRowPanel");
      setUnsavedChangesOpen(true);
      return false;
    }
    setComponentRowPanelSession(null);
  }, []);

  const closeComponentRowPanel = useCallback(() => {
    componentRowPanelSessionRef.current = null;
    setComponentRowPanelSession(null);
    closeThirdRail();
  }, [closeThirdRail]);

  const openComponentPanelAt = useCallback(
    (
      target: ComponentPanelTarget,
      label: string,
      treeScope: ComponentsTreeScope,
      stepIndex: number,
    ) => {
      const currentEditor = editorRef.current;
      const baseline = readScopedLayoutSnapshot(
        currentEditor,
        treeScope,
        stepIndex,
      );
      const session: ComponentRowPanelSession = {
        target,
        label,
        treeScope,
        stepIndex,
        baseline,
      };
      setComponentRowPanelSession(session);
      const contextValue = contextValueRef.current;
      if (!contextValue) {
        return;
      }
      openThirdRail({
        title: label,
        headerActions: <FormDesignerComponentPanelThirdRailHeaderActions />,
        body: <FormDesignerComponentPanelThirdRailBody />,
        footer: <FormDesignerComponentPanelThirdRailFooter />,
        resizeContent: true,
        onClose: guardComponentRowPanelClose,
      });
    },
    [guardComponentRowPanelClose, openThirdRail],
  );

  const switchComponentPanel = useCallback(
    (
      target: ComponentPanelTarget,
      label: string,
      treeScope: ComponentsTreeScope,
      stepIndex: number,
    ) => {
      const currentEditor = editorRef.current;
      const baseline = readScopedLayoutSnapshot(
        currentEditor,
        treeScope,
        stepIndex,
      );
      const session: ComponentRowPanelSession = {
        target,
        label,
        treeScope,
        stepIndex,
        baseline,
      };
      setComponentRowPanelSession(session);
      const contextValue = contextValueRef.current;
      if (!contextValue) {
        return;
      }
      updateThirdRail({
        title: label,
      });
    },
    [updateThirdRail],
  );

  const requestComponentPanel = useCallback(
    (
      target: ComponentPanelTarget,
      label: string,
      scope: {
        readonly treeScope: ComponentsTreeScope;
        readonly stepIndex: number;
      },
    ) => {
      if (!componentRowPanelSession) {
        openComponentPanelAt(target, label, scope.treeScope, scope.stepIndex);
        return;
      }
      if (
        areComponentPanelTargetsEqual(componentRowPanelSession.target, target)
      ) {
        if (componentRowPanelIsDirty) {
          setPendingComponentRowAction({ type: "close" });
          setUnsavedReason("componentRowPanel");
          setUnsavedChangesOpen(true);
          return;
        }
        closeComponentRowPanel();
        return;
      }
      if (componentRowPanelIsDirty) {
        setPendingComponentRowAction({
          type: "switch",
          target,
          label,
          treeScope: scope.treeScope,
          stepIndex: scope.stepIndex,
        });
        setUnsavedReason("componentRowPanel");
        setUnsavedChangesOpen(true);
        return;
      }
      switchComponentPanel(target, label, scope.treeScope, scope.stepIndex);
    },
    [
      closeComponentRowPanel,
      componentRowPanelIsDirty,
      componentRowPanelSession,
      openComponentPanelAt,
      switchComponentPanel,
    ],
  );

  const executePendingComponentRowAction = useCallback(
    (action: ComponentRowPanelPendingAction) => {
      if (action.type === "close") {
        closeComponentRowPanel();
        return;
      }
      switchComponentPanel(
        action.target,
        action.label,
        action.treeScope,
        action.stepIndex,
      );
    },
    [closeComponentRowPanel, switchComponentPanel],
  );

  const requestComponentRowPanel = useCallback(
    (
      rowRef: ComponentRowRef,
      label: string,
      scope: {
        readonly treeScope: ComponentsTreeScope;
        readonly stepIndex: number;
      },
    ) => {
      requestComponentPanel({ kind: "row", rowRef }, label, scope);
    },
    [requestComponentPanel],
  );

  const requestComponentColumnPanel = useCallback(
    (
      columnRef: ComponentColumnRef,
      label: string,
      scope: {
        readonly treeScope: ComponentsTreeScope;
        readonly stepIndex: number;
      },
    ) => {
      requestComponentPanel({ kind: "column", columnRef }, label, scope);
    },
    [requestComponentPanel],
  );

  const requestCloseComponentRowPanel = useCallback(() => {
    if (!componentRowPanelSession) {
      closeThirdRail();
      return;
    }
    if (componentRowPanelIsDirty) {
      setPendingComponentRowAction({ type: "close" });
      setUnsavedReason("componentRowPanel");
      setUnsavedChangesOpen(true);
      return;
    }
    closeComponentRowPanel();
  }, [
    closeComponentRowPanel,
    closeThirdRail,
    componentRowPanelIsDirty,
    componentRowPanelSession,
  ]);

  const commitComponentRowPanelSave = useCallback(() => {
    if (!componentRowPanelSession || !currentScopedLayoutSnapshot) {
      closeComponentRowPanel();
      return;
    }
    const savedSession: ComponentRowPanelSession = {
      ...componentRowPanelSession,
      baseline: currentScopedLayoutSnapshot,
    };
    componentRowPanelSessionRef.current = savedSession;
    setComponentRowPanelSession(savedSession);
    markComponentsDirty();
    closeComponentRowPanel();
  }, [
    closeComponentRowPanel,
    componentRowPanelSession,
    currentScopedLayoutSnapshot,
    markComponentsDirty,
  ]);

  const guardColumnPanelClose = useCallback((): void | boolean => {
    const session = columnPanelSessionRef.current;
    if (!session) {
      return;
    }
    const currentEditor = editorRef.current;
    const current = readLayoutSnapshot(
      currentEditor.presentation === "wizard"
        ? currentEditor.wizard.shellLayout
        : currentEditor.plainLayout,
    );
    if (isColumnPanelDirty(session.baseline, current)) {
      setPendingColumnAction({ type: "close" });
      setUnsavedReason("columnPanel");
      setUnsavedChangesOpen(true);
      return false;
    }
    setColumnPanelSession(null);
  }, []);

  const openColumnPanelAt = useCallback(
    (columnIndex: number) => {
      const currentEditor = editorRef.current;
      const baseline = readLayoutSnapshot(
        currentEditor.presentation === "wizard"
          ? currentEditor.wizard.shellLayout
          : currentEditor.plainLayout,
      );
      setColumnPanelSession({ columnIndex, baseline });
      const contextValue = contextValueRef.current;
      if (!contextValue) {
        return;
      }
      const columnPanelTitle = t("formDesigner.layout.columnPanelTitle", {
        column: columnIndex + 1,
      });
      openThirdRail({
        title: columnPanelTitle,
        headerActions: <FormDesignerLayoutColumnThirdRailHeaderActions />,
        body: <FormDesignerLayoutColumnThirdRailBody />,
        footer: <FormDesignerLayoutColumnThirdRailFooter />,
        resizeContent: true,
        onClose: guardColumnPanelClose,
      });
    },
    [guardColumnPanelClose, openThirdRail, t],
  );

  const switchColumnPanel = useCallback(
    (columnIndex: number) => {
      const currentEditor = editorRef.current;
      const baseline = readLayoutSnapshot(
        currentEditor.presentation === "wizard"
          ? currentEditor.wizard.shellLayout
          : currentEditor.plainLayout,
      );
      setColumnPanelSession({ columnIndex, baseline });
      const contextValue = contextValueRef.current;
      if (!contextValue) {
        return;
      }
      const columnPanelTitle = t("formDesigner.layout.columnPanelTitle", {
        column: columnIndex + 1,
      });
      updateThirdRail({
        title: columnPanelTitle,
      });
    },
    [t, updateThirdRail],
  );

  const closeRootLayoutPanel = useCallback(() => {
    rootLayoutPanelSessionRef.current = null;
    setRootLayoutPanelSession(null);
    closeThirdRail();
  }, [closeThirdRail]);

  const guardRootLayoutPanelClose = useCallback((): void | boolean => {
    const session = rootLayoutPanelSessionRef.current;
    if (!session) {
      return;
    }
    const currentEditor = editorRef.current;
    const current = readLayoutSnapshot(
      currentEditor.presentation === "wizard"
        ? currentEditor.wizard.shellLayout
        : currentEditor.plainLayout,
    );
    if (isColumnPanelDirty(session.baseline, current)) {
      setPendingRootLayoutAction({ type: "close" });
      setUnsavedReason("rootLayoutPanel");
      setUnsavedChangesOpen(true);
      return false;
    }
    setRootLayoutPanelSession(null);
  }, []);

  const openRootLayoutPanelAt = useCallback(() => {
    const currentEditor = editorRef.current;
    const baseline = readLayoutSnapshot(
      currentEditor.presentation === "wizard"
        ? currentEditor.wizard.shellLayout
        : currentEditor.plainLayout,
    );
    const session = { baseline };
    rootLayoutPanelSessionRef.current = session;
    setRootLayoutPanelSession(session);
    const contextValue = contextValueRef.current;
    if (!contextValue) {
      return;
    }
    openThirdRail({
      title: t("formDesigner.layout.rootLayoutPanelTitle"),
      body: <FormDesignerRootLayoutThirdRailBody />,
      footer: <FormDesignerRootLayoutThirdRailFooter />,
      resizeContent: true,
      onClose: guardRootLayoutPanelClose,
    });
  }, [guardRootLayoutPanelClose, openThirdRail, t]);

  const executePendingRootLayoutAction = useCallback(
    (action: RootLayoutPanelPendingAction) => {
      if (action.type === "close") {
        closeRootLayoutPanel();
        return;
      }
      closeRootLayoutPanel();
      openColumnPanelAt(action.columnIndex);
    },
    [closeRootLayoutPanel, openColumnPanelAt],
  );

  const executePendingColumnAction = useCallback(
    (action: ColumnPanelPendingAction) => {
      if (action.type === "close") {
        closeColumnPanel();
        return;
      }
      if (action.type === "openRootLayout") {
        columnPanelSessionRef.current = null;
        setColumnPanelSession(null);
        openRootLayoutPanelAt();
        return;
      }
      switchColumnPanel(action.columnIndex);
    },
    [closeColumnPanel, openRootLayoutPanelAt, switchColumnPanel],
  );

  const requestCloseRootLayoutPanel = useCallback(() => {
    if (!rootLayoutPanelSession) {
      closeThirdRail();
      return;
    }
    if (rootLayoutPanelIsDirty) {
      setPendingRootLayoutAction({ type: "close" });
      setUnsavedReason("rootLayoutPanel");
      setUnsavedChangesOpen(true);
      return;
    }
    closeRootLayoutPanel();
  }, [
    closeRootLayoutPanel,
    closeThirdRail,
    rootLayoutPanelIsDirty,
    rootLayoutPanelSession,
  ]);

  const requestRootLayoutPanel = useCallback(() => {
    if (rootLayoutPanelSession) {
      requestCloseRootLayoutPanel();
      return;
    }

    if (columnPanelSession) {
      if (columnPanelIsDirty) {
        setPendingColumnAction({ type: "openRootLayout" });
        setUnsavedReason("columnPanel");
        setUnsavedChangesOpen(true);
        return;
      }
      columnPanelSessionRef.current = null;
      setColumnPanelSession(null);
    }

    openRootLayoutPanelAt();
  }, [
    columnPanelIsDirty,
    columnPanelSession,
    openRootLayoutPanelAt,
    requestCloseRootLayoutPanel,
    rootLayoutPanelSession,
  ]);

  const commitRootLayoutPanelSave = useCallback(() => {
    if (!rootLayoutPanelSession) {
      closeRootLayoutPanel();
      return;
    }
    const savedSession = {
      baseline: currentLayoutSnapshot,
    };
    rootLayoutPanelSessionRef.current = savedSession;
    setRootLayoutPanelSession(savedSession);
    closeRootLayoutPanel();
  }, [closeRootLayoutPanel, currentLayoutSnapshot, rootLayoutPanelSession]);

  const requestLayoutColumnPanel = useCallback(
    (columnIndex: number) => {
      if (rootLayoutPanelSession) {
        if (rootLayoutPanelIsDirty) {
          setPendingRootLayoutAction({ type: "openColumn", columnIndex });
          setUnsavedReason("rootLayoutPanel");
          setUnsavedChangesOpen(true);
          return;
        }
        rootLayoutPanelSessionRef.current = null;
        setRootLayoutPanelSession(null);
      }

      if (!columnPanelSession) {
        openColumnPanelAt(columnIndex);
        return;
      }
      if (columnPanelSession.columnIndex === columnIndex) {
        return;
      }
      if (columnPanelIsDirty) {
        setPendingColumnAction({ type: "switch", columnIndex });
        setUnsavedReason("columnPanel");
        setUnsavedChangesOpen(true);
        return;
      }
      switchColumnPanel(columnIndex);
    },
    [
      columnPanelIsDirty,
      columnPanelSession,
      openColumnPanelAt,
      rootLayoutPanelIsDirty,
      rootLayoutPanelSession,
      switchColumnPanel,
    ],
  );

  const requestCloseLayoutColumnPanel = useCallback(() => {
    if (!columnPanelSession) {
      closeThirdRail();
      return;
    }
    if (columnPanelIsDirty) {
      setPendingColumnAction({ type: "close" });
      setUnsavedReason("columnPanel");
      setUnsavedChangesOpen(true);
      return;
    }
    closeColumnPanel();
  }, [
    closeColumnPanel,
    closeThirdRail,
    columnPanelIsDirty,
    columnPanelSession,
  ]);

  const commitColumnPanelSave = useCallback(() => {
    if (!columnPanelSession) {
      closeColumnPanel();
      return;
    }
    const savedSession = {
      columnIndex: columnPanelSession.columnIndex,
      baseline: currentLayoutSnapshot,
    };
    columnPanelSessionRef.current = savedSession;
    setColumnPanelSession(savedSession);
    closeColumnPanel();
  }, [closeColumnPanel, columnPanelSession, currentLayoutSnapshot]);

  const confirmUnsavedSave = useCallback(async () => {
    if (unsavedReason === "columnPanel") {
      const action = pendingColumnAction;
      if (!action || !columnPanelSession) {
        setUnsavedChangesOpen(false);
        return;
      }
      setColumnPanelSession({
        columnIndex: columnPanelSession.columnIndex,
        baseline: currentLayoutSnapshot,
      });
      setUnsavedChangesOpen(false);
      setPendingColumnAction(null);
      setUnsavedReason(null);
      executePendingColumnAction(action);
      return;
    }

    if (unsavedReason === "rootLayoutPanel") {
      const action = pendingRootLayoutAction;
      if (!action || !rootLayoutPanelSession) {
        setUnsavedChangesOpen(false);
        return;
      }
      const savedSession = {
        baseline: currentLayoutSnapshot,
      };
      rootLayoutPanelSessionRef.current = savedSession;
      setRootLayoutPanelSession(savedSession);
      setUnsavedChangesOpen(false);
      setPendingRootLayoutAction(null);
      setUnsavedReason(null);
      executePendingRootLayoutAction(action);
      return;
    }

    if (unsavedReason === "componentRowPanel") {
      const action = pendingComponentRowAction;
      if (
        !action ||
        !componentRowPanelSession ||
        !currentScopedLayoutSnapshot
      ) {
        setUnsavedChangesOpen(false);
        return;
      }
      setComponentRowPanelSession({
        ...componentRowPanelSession,
        baseline: currentScopedLayoutSnapshot,
      });
      markComponentsDirty();
      setUnsavedChangesOpen(false);
      setPendingComponentRowAction(null);
      setUnsavedReason(null);
      executePendingComponentRowAction(action);
      return;
    }

    const pending = pendingTabId;
    const tabToSave = unsavedTabId;
    if (!pending || !tabToSave) {
      setUnsavedChangesOpen(false);
      return;
    }

    let error: string | null = null;
    if (tabToSave === "design") {
      if (layoutIsDirty) {
        error = await saveLayout();
      }
      if (!error && componentsIsDirty) {
        error = await saveComponents();
      }
    } else {
      error = await saveSettings();
    }
    if (error) {
      return;
    }

    setUnsavedChangesOpen(false);
    setPendingTabId(null);
    setUnsavedTabId(null);
    setUnsavedReason(null);
    navigateToTab(pending);
  }, [
    columnPanelSession,
    componentRowPanelSession,
    currentLayoutSnapshot,
    currentScopedLayoutSnapshot,
    executePendingColumnAction,
    executePendingComponentRowAction,
    executePendingRootLayoutAction,
    markComponentsDirty,
    navigateToTab,
    pendingColumnAction,
    pendingComponentRowAction,
    pendingRootLayoutAction,
    pendingTabId,
    rootLayoutPanelSession,
    saveComponents,
    saveLayout,
    saveSettings,
    componentsIsDirty,
    layoutIsDirty,
    unsavedReason,
    unsavedTabId,
  ]);

  const confirmUnsavedDiscard = useCallback(() => {
    if (unsavedReason === "columnPanel") {
      const action = pendingColumnAction;
      const session = columnPanelSession;
      if (!action || !session) {
        setUnsavedChangesOpen(false);
        return;
      }
      applyLayoutSnapshotToEditor(
        editor,
        session.baseline,
        editor.presentation,
      );
      setUnsavedChangesOpen(false);
      setPendingColumnAction(null);
      setUnsavedReason(null);
      executePendingColumnAction(action);
      return;
    }

    if (unsavedReason === "rootLayoutPanel") {
      const action = pendingRootLayoutAction;
      const session = rootLayoutPanelSession;
      if (!action || !session) {
        setUnsavedChangesOpen(false);
        return;
      }
      applyLayoutSnapshotToEditor(
        editor,
        session.baseline,
        editor.presentation,
      );
      setUnsavedChangesOpen(false);
      setPendingRootLayoutAction(null);
      setUnsavedReason(null);
      executePendingRootLayoutAction(action);
      return;
    }

    if (unsavedReason === "componentRowPanel") {
      const action = pendingComponentRowAction;
      const session = componentRowPanelSession;
      if (!action || !session) {
        setUnsavedChangesOpen(false);
        return;
      }
      applyScopedLayoutSnapshot(
        editor,
        session.baseline,
        session.treeScope,
        session.stepIndex,
      );
      setUnsavedChangesOpen(false);
      setPendingComponentRowAction(null);
      setUnsavedReason(null);
      executePendingComponentRowAction(action);
      return;
    }

    const pending = pendingTabId;
    const tabToDiscard = unsavedTabId;
    if (!pending || !tabToDiscard) {
      setUnsavedChangesOpen(false);
      return;
    }

    if (tabToDiscard === "design") {
      if (layoutIsDirty) {
        discardLayout();
      }
      if (componentsIsDirty) {
        discardComponents();
      }
    } else {
      discardSettings();
    }

    setUnsavedChangesOpen(false);
    setPendingTabId(null);
    setUnsavedTabId(null);
    setUnsavedReason(null);
    navigateToTab(pending);
  }, [
    columnPanelSession,
    componentRowPanelSession,
    discardComponents,
    discardLayout,
    discardSettings,
    componentsIsDirty,
    layoutIsDirty,
    editor,
    executePendingColumnAction,
    executePendingComponentRowAction,
    executePendingRootLayoutAction,
    navigateToTab,
    pendingColumnAction,
    pendingComponentRowAction,
    pendingRootLayoutAction,
    pendingTabId,
    rootLayoutPanelSession,
    unsavedReason,
    unsavedTabId,
  ]);

  const cancelUnsavedChanges = useCallback(() => {
    setUnsavedChangesOpen(false);
    setPendingTabId(null);
    setUnsavedTabId(null);
    setPendingColumnAction(null);
    setPendingRootLayoutAction(null);
    setPendingComponentRowAction(null);
    setUnsavedReason(null);
  }, []);

  const openLayoutColumnPanel = requestLayoutColumnPanel;

  const openOverlayPreview = useCallback(() => {
    setOverlayPreviewOpen(true);
  }, []);

  const closeOverlayPreview = useCallback(() => {
    setOverlayPreviewOpen(false);
  }, []);

  const value = useMemo(
    (): FormDesignerContextValue => ({
      editor,
      preview,
      canSave,
      previewBreakpoint,
      setPreviewBreakpoint,
      previewMobileDeviceId,
      setPreviewMobileDeviceId,
      previewColorScheme,
      setPreviewColorScheme,
      activeTabId,
      settingsIsDirty,
      layoutIsDirty,
      componentsIsDirty,
      unsavedTabId,
      saveSettings,
      discardSettings,
      saveLayout,
      discardLayout,
      saveComponents,
      discardComponents,
      markComponentsDirty,
      requestTabChange,
      unsavedChangesOpen,
      pendingTabId,
      confirmUnsavedSave,
      confirmUnsavedDiscard,
      cancelUnsavedChanges,
      unsavedReason,
      columnPanelIsDirty,
      selectedLayoutColumnIndex: columnPanelSession?.columnIndex ?? null,
      requestLayoutColumnPanel,
      requestCloseLayoutColumnPanel,
      commitColumnPanelSave,
      rootLayoutPanelOpen,
      rootLayoutPanelIsDirty,
      requestRootLayoutPanel,
      requestCloseRootLayoutPanel,
      commitRootLayoutPanelSave,
      openLayoutColumnPanel,
      overlayPreviewOpen,
      openOverlayPreview,
      closeOverlayPreview,
      selectedComponentRowRef:
        componentRowPanelSession?.target.kind === "row"
          ? componentRowPanelSession.target.rowRef
          : null,
      selectedComponentColumnRef:
        componentRowPanelSession?.target.kind === "column"
          ? componentRowPanelSession.target.columnRef
          : null,
      componentRowPanelOpen: componentRowPanelSession != null,
      requestComponentRowPanel,
      requestComponentColumnPanel,
      requestCloseComponentRowPanel,
      commitComponentRowPanelSave,
      componentRowPanelIsDirty,
    }),
    [
      activeTabId,
      cancelUnsavedChanges,
      canSave,
      closeOverlayPreview,
      componentRowPanelSession,
      columnPanelIsDirty,
      columnPanelSession,
      commitColumnPanelSave,
      commitComponentRowPanelSave,
      commitRootLayoutPanelSave,
      componentRowPanelIsDirty,
      confirmUnsavedDiscard,
      confirmUnsavedSave,
      componentsIsDirty,
      discardComponents,
      discardLayout,
      discardSettings,
      editor,
      layoutIsDirty,
      markComponentsDirty,
      preview,
      openLayoutColumnPanel,
      openOverlayPreview,
      overlayPreviewOpen,
      pendingTabId,
      requestCloseComponentRowPanel,
      requestComponentColumnPanel,
      requestComponentRowPanel,
      previewBreakpoint,
      previewMobileDeviceId,
      previewColorScheme,
      requestCloseLayoutColumnPanel,
      requestCloseRootLayoutPanel,
      requestLayoutColumnPanel,
      requestRootLayoutPanel,
      requestTabChange,
      rootLayoutPanelIsDirty,
      rootLayoutPanelOpen,
      saveComponents,
      saveLayout,
      saveSettings,
      settingsIsDirty,
      unsavedChangesOpen,
      unsavedReason,
      unsavedTabId,
    ],
  );

  contextValueRef.current = value;

  formDesignerComponentPanelThirdRail.publish({
    contextValue: value,
    session: componentRowPanelSession,
  });

  formDesignerLayoutColumnThirdRail.publish({
    contextValue: value,
    session: columnPanelSession
      ? { columnIndex: columnPanelSession.columnIndex }
      : null,
  });

  formDesignerRootLayoutThirdRail.publish({
    contextValue: value,
    session: rootLayoutPanelSession ? { kind: "root" } : null,
  });

  return (
    <FormDesignerContext.Provider value={value}>
      {children}
    </FormDesignerContext.Provider>
  );
}
