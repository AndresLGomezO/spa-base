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

import { DEFAULT_GROUPED_COLUMN_INDEX } from "../../components/design-layout/resolve-first-structure-selection";
import { useAnyPermission } from "../../auth/useAnyPermission";
import type { EntityName } from "../../entities/entity-catalog";
import { useEntityDefinition } from "../../entities/entity-catalog-context";
import { useEntity } from "../../hooks/useEntity";
import {
  DEFAULT_LAYOUT_PREVIEW_BREAKPOINT,
  type LayoutPreviewBreakpoint,
} from "../ui-builder/LayoutPreviewPanel";
import { useDesignerListLayoutEditor } from "../ui-builder/use-designer-list-layout-editor";
import { DEFAULT_MOBILE_PREVIEW_DEVICE_ID } from "../form-designer/mobile-preview-device-presets";
import type { MobilePreviewDeviceId } from "../form-designer/mobile-preview-device-presets";
import type { ComponentColumnRef } from "../form-designer/form-designer-component-column-ref";
import type { ComponentRowRef } from "../form-designer/form-designer-component-row-ref";
import {
  ItemListDesignerContext,
  type ItemListDesignerContextValue,
} from "./item-list-designer-context";
import {
  ITEM_LIST_DESIGNER_COLUMNS_SCOPE_SEARCH_PARAM,
  parseItemListColumnsScope,
  type ItemListColumnsScope,
} from "./item-list-designer-columns-scope";
import {
  applyPanelSessionSnapshot,
  readGroupedColumnDisplayFrom,
  readGroupedColumnDisplayFromBaseline,
  readGroupedColumnDisplayTo,
  readGroupedColumnDisplayToBaseline,
  readGroupedColumnLabel,
  readGroupedColumnLabelBaseline,
  readScopeLayoutSnapshot,
} from "./item-list-designer-layout-binding";
import {
  areItemListPanelTargetsEqual,
  isItemListPanelSessionDirty,
  type ItemListPanelPendingAction,
  type ItemListPanelSession,
  type ItemListUnsavedReason,
} from "./item-list-designer-panel-session";
import { itemListDesignerThirdRail } from "./item-list-designer-third-rail";

const ItemListThirdRailHeaderActions = itemListDesignerThirdRail.HeaderActions;
const ItemListThirdRailBody = itemListDesignerThirdRail.Body;
const ItemListThirdRailFooter = itemListDesignerThirdRail.Footer;
import type {
  ItemListPanelTarget,
  ItemListStructureScope,
} from "./item-list-designer-structure-scope";
import {
  applyColumnsSnapshotToEditor,
  applyLayoutSnapshotToEditor,
  applySettingsSnapshotToEditor,
  areColumnsSnapshotsEqual,
  areLayoutSnapshotsEqual,
  areSettingsSnapshotsEqual,
  readColumnsSnapshot,
  readColumnsSnapshotFromDefinition,
  readLayoutSnapshot,
  readLayoutSnapshotFromDefinition,
  readSettingsSnapshot,
  readSettingsSnapshotFromDefinition,
  viewTypeFromLayoutPresetId,
  type ItemListDesignerColumnsSnapshot,
  type ItemListDesignerLayoutSnapshot,
  type ItemListDesignerSettingsSnapshot,
} from "./item-list-designer-snapshots";
import {
  ITEM_LIST_DESIGNER_TAB_SEARCH_PARAM,
  isItemListDesignerTabId,
  parseItemListDesignerTabId,
  type ItemListDesignerTabId,
} from "./item-list-designer-tabs";

function isTabDirty(
  tabId: ItemListDesignerTabId,
  settingsIsDirty: boolean,
  designIsDirty: boolean,
): boolean {
  if (tabId === "settings") {
    return settingsIsDirty;
  }
  if (tabId === "design") {
    return designIsDirty;
  }
  return false;
}

function shouldConfirmTabChange(
  fromTab: ItemListDesignerTabId,
  toTab: ItemListDesignerTabId,
  settingsIsDirty: boolean,
  designIsDirty: boolean,
): boolean {
  return (
    fromTab !== toTab && isTabDirty(fromTab, settingsIsDirty, designIsDirty)
  );
}

function applyTabToSearchParams(
  searchParams: URLSearchParams,
  tabId: ItemListDesignerTabId,
): URLSearchParams {
  const next = new URLSearchParams(searchParams);
  if (tabId === "settings") {
    next.delete(ITEM_LIST_DESIGNER_TAB_SEARCH_PARAM);
  } else {
    next.set(ITEM_LIST_DESIGNER_TAB_SEARCH_PARAM, tabId);
  }
  return next;
}

function applyColumnsScopeToSearchParams(
  searchParams: URLSearchParams,
  scope: ItemListColumnsScope,
): URLSearchParams {
  const next = new URLSearchParams(searchParams);
  if (scope === "grouped") {
    next.delete(ITEM_LIST_DESIGNER_COLUMNS_SCOPE_SEARCH_PARAM);
  } else {
    next.set(ITEM_LIST_DESIGNER_COLUMNS_SCOPE_SEARCH_PARAM, scope);
  }
  return next;
}

interface ItemListDesignerProviderProps {
  readonly entityName: EntityName;
  readonly customViewId?: string;
  readonly children: ReactNode;
}

export function ItemListDesignerProvider({
  entityName,
  customViewId,
  children,
}: ItemListDesignerProviderProps) {
  const { t } = useTranslation("common");
  const editor = useDesignerListLayoutEditor(entityName, customViewId);
  const definition = useEntityDefinition(entityName);
  const canSave = useAnyPermission(ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS);
  const [searchParams, setSearchParams] = useSearchParams();
  const { colorScheme: appColorScheme } = useColorScheme();
  const { items, isLoading } = useEntity(entityName, { page: 1 });
  const previewItem =
    items.length > 0 ? (items[0] as Record<string, unknown>) : null;

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

  const [savedSettingsBaseline, setSavedSettingsBaseline] =
    useState<ItemListDesignerSettingsSnapshot>(() =>
      readSettingsSnapshotFromDefinition(definition, editor),
    );
  const [savedColumnsBaseline, setSavedColumnsBaseline] =
    useState<ItemListDesignerColumnsSnapshot>(() => {
      const settingsBaseline = readSettingsSnapshotFromDefinition(
        definition,
        editor,
      );
      return readColumnsSnapshotFromDefinition(
        definition,
        editor.fieldPaths,
        editor,
        viewTypeFromLayoutPresetId(settingsBaseline.layoutPresetId),
      );
    });
  const [savedLayoutBaseline, setSavedLayoutBaseline] =
    useState<ItemListDesignerLayoutSnapshot>(() =>
      readLayoutSnapshotFromDefinition(definition, editor),
    );

  const [unsavedChangesOpen, setUnsavedChangesOpen] = useState(false);
  const [pendingTabId, setPendingTabId] =
    useState<ItemListDesignerTabId | null>(null);
  const [unsavedTabId, setUnsavedTabId] =
    useState<ItemListDesignerTabId | null>(null);
  const [unsavedReason, setUnsavedReason] =
    useState<ItemListUnsavedReason | null>(null);
  const [pendingPanelAction, setPendingPanelAction] =
    useState<ItemListPanelPendingAction | null>(null);
  const [pendingColumnsScope, setPendingColumnsScope] =
    useState<ItemListColumnsScope | null>(null);
  const [activeGroupedColumnIndex, setActiveGroupedColumnIndex] = useState(
    DEFAULT_GROUPED_COLUMN_INDEX,
  );

  useEffect(() => {
    setActiveGroupedColumnIndex(DEFAULT_GROUPED_COLUMN_INDEX);
  }, [entityName]);

  const [structurePanelSession, setStructurePanelSession] =
    useState<ItemListPanelSession | null>(null);
  const structurePanelSessionRef = useRef(structurePanelSession);
  structurePanelSessionRef.current = structurePanelSession;
  const editorRef = useRef(editor);
  editorRef.current = editor;
  const contextValueRef = useRef<ItemListDesignerContextValue | null>(null);

  const activeTabId = useMemo(
    () =>
      parseItemListDesignerTabId(
        searchParams.get(ITEM_LIST_DESIGNER_TAB_SEARCH_PARAM),
      ),
    [searchParams],
  );

  const columnsScope = useMemo(
    () =>
      parseItemListColumnsScope(
        searchParams.get(ITEM_LIST_DESIGNER_COLUMNS_SCOPE_SEARCH_PARAM),
      ),
    [searchParams],
  );

  const structureScope = useMemo((): ItemListStructureScope => {
    if (activeTabId === "design" && editor.viewType === "card") {
      return { kind: "listItem" };
    }

    if (columnsScope === "expanded") {
      return { kind: "expandableRow" };
    }

    return {
      kind: "groupedColumnCell",
      columnIndex: activeGroupedColumnIndex,
    };
  }, [activeGroupedColumnIndex, activeTabId, columnsScope, editor.viewType]);

  const currentSettingsSnapshot = useMemo(
    () => readSettingsSnapshot(editor),
    [editor],
  );
  const currentColumnsSnapshot = useMemo(
    () => readColumnsSnapshot(editor),
    [editor],
  );

  const currentLayoutSnapshot = useMemo(
    () => readLayoutSnapshot(editor),
    [editor],
  );

  const settingsIsDirty = useMemo(
    () =>
      !areSettingsSnapshotsEqual(
        savedSettingsBaseline,
        currentSettingsSnapshot,
      ),
    [currentSettingsSnapshot, savedSettingsBaseline],
  );

  const columnsIsDirty = useMemo(
    () =>
      !areColumnsSnapshotsEqual(savedColumnsBaseline, currentColumnsSnapshot),
    [currentColumnsSnapshot, savedColumnsBaseline],
  );

  const layoutIsDirty = useMemo(
    () => !areLayoutSnapshotsEqual(savedLayoutBaseline, currentLayoutSnapshot),
    [currentLayoutSnapshot, savedLayoutBaseline],
  );

  const designIsDirty =
    editor.viewType === "card" ? layoutIsDirty : columnsIsDirty;

  const currentScopedLayoutSnapshot = useMemo(() => {
    if (!structurePanelSession) {
      return null;
    }

    return readScopeLayoutSnapshot(
      editor,
      structurePanelSession.structureScope,
    );
  }, [editor, structurePanelSession]);

  const currentGroupedColumnLabel = useMemo(() => {
    if (
      !structurePanelSession ||
      structurePanelSession.structureScope.kind !== "groupedColumnCell"
    ) {
      return undefined;
    }

    return readGroupedColumnLabel(
      editor,
      structurePanelSession.structureScope.columnIndex,
    );
  }, [editor, structurePanelSession]);

  const currentGroupedColumnDisplayFrom = useMemo(() => {
    if (
      !structurePanelSession ||
      structurePanelSession.structureScope.kind !== "groupedColumnCell"
    ) {
      return undefined;
    }

    return readGroupedColumnDisplayFrom(
      editor,
      structurePanelSession.structureScope.columnIndex,
    );
  }, [editor, structurePanelSession]);

  const currentGroupedColumnDisplayTo = useMemo(() => {
    if (
      !structurePanelSession ||
      structurePanelSession.structureScope.kind !== "groupedColumnCell"
    ) {
      return undefined;
    }

    return readGroupedColumnDisplayTo(
      editor,
      structurePanelSession.structureScope.columnIndex,
    );
  }, [editor, structurePanelSession]);

  const structurePanelIsDirty = useMemo(() => {
    if (!structurePanelSession || !currentScopedLayoutSnapshot) {
      return false;
    }

    return isItemListPanelSessionDirty(
      structurePanelSession,
      currentScopedLayoutSnapshot,
      currentGroupedColumnLabel,
      currentGroupedColumnDisplayFrom,
      currentGroupedColumnDisplayTo,
    );
  }, [
    currentGroupedColumnDisplayFrom,
    currentGroupedColumnDisplayTo,
    currentGroupedColumnLabel,
    currentScopedLayoutSnapshot,
    structurePanelSession,
  ]);

  const selectedStructureRowRef =
    structurePanelSession?.target.kind === "row"
      ? structurePanelSession.target.rowRef
      : null;
  const selectedStructureColumnRef =
    structurePanelSession?.target.kind === "column"
      ? structurePanelSession.target.columnRef
      : null;
  const selectedGroupedColumnIndex =
    structurePanelSession?.target.kind === "groupedColumn"
      ? structurePanelSession.target.columnIndex
      : null;

  const syncSavedBaselinesAfterSave = useCallback(() => {
    setSavedSettingsBaseline(readSettingsSnapshot(editor));
    setSavedColumnsBaseline(readColumnsSnapshot(editor));
    setSavedLayoutBaseline(readLayoutSnapshot(editor));
  }, [editor]);

  useEffect(() => {
    const currentEditor = editorRef.current;
    const settingsBaseline = readSettingsSnapshotFromDefinition(
      definition,
      currentEditor,
    );
    setSavedSettingsBaseline(settingsBaseline);
    setSavedColumnsBaseline(
      readColumnsSnapshotFromDefinition(
        definition,
        editor.fieldPaths,
        currentEditor,
        viewTypeFromLayoutPresetId(settingsBaseline.layoutPresetId),
      ),
    );
    setSavedLayoutBaseline(
      readLayoutSnapshotFromDefinition(definition, currentEditor),
    );
  }, [definition, editor.fieldPaths]);

  useEffect(() => {
    if (
      activeTabId === "design" &&
      editor.viewType !== "card" &&
      editor.viewType !== "table" &&
      editor.viewType !== "expandableTable"
    ) {
      setSearchParams(
        (current) => applyTabToSearchParams(current, "settings"),
        { replace: true },
      );
    }
  }, [activeTabId, editor.viewType, setSearchParams]);

  useEffect(() => {
    if (activeGroupedColumnIndex >= editor.expandableColumns.length) {
      setActiveGroupedColumnIndex(
        Math.max(0, editor.expandableColumns.length - 1),
      );
    }
  }, [activeGroupedColumnIndex, editor.expandableColumns.length]);

  const navigateToTab = useCallback(
    (tabId: ItemListDesignerTabId) => {
      setSearchParams((current) => applyTabToSearchParams(current, tabId), {
        replace: true,
      });
    },
    [setSearchParams],
  );

  const navigateToColumnsScope = useCallback(
    (scope: ItemListColumnsScope) => {
      setSearchParams(
        (current) => applyColumnsScopeToSearchParams(current, scope),
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const saveAll = useCallback(async (): Promise<string | null> => {
    const ok = await editor.save();
    if (ok) {
      syncSavedBaselinesAfterSave();
      return null;
    }
    return t("entity.viewSettings.saveFailed");
  }, [editor, syncSavedBaselinesAfterSave, t]);

  const saveSettings = useCallback(async (): Promise<string | null> => {
    return saveAll();
  }, [saveAll]);

  const saveColumns = useCallback(async (): Promise<string | null> => {
    return saveAll();
  }, [saveAll]);

  const saveLayout = useCallback(async (): Promise<string | null> => {
    return saveAll();
  }, [saveAll]);

  const discardSettings = useCallback(() => {
    applySettingsSnapshotToEditor(editor, savedSettingsBaseline);
  }, [editor, savedSettingsBaseline]);

  const discardColumns = useCallback(() => {
    applyColumnsSnapshotToEditor(editor, savedColumnsBaseline);
  }, [editor, savedColumnsBaseline]);

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

    const currentEditor = editorRef.current;
    const current = readScopeLayoutSnapshot(
      currentEditor,
      session.structureScope,
    );
    const currentLabel = readGroupedColumnLabelBaseline(
      currentEditor,
      session.structureScope,
    );
    const currentDisplayFrom = readGroupedColumnDisplayFrom(
      currentEditor,
      session.structureScope.kind === "groupedColumnCell"
        ? session.structureScope.columnIndex
        : 0,
    );
    const currentDisplayTo = readGroupedColumnDisplayTo(
      currentEditor,
      session.structureScope.kind === "groupedColumnCell"
        ? session.structureScope.columnIndex
        : 0,
    );
    if (
      isItemListPanelSessionDirty(
        session,
        current,
        currentLabel,
        session.structureScope.kind === "groupedColumnCell"
          ? currentDisplayFrom
          : undefined,
        session.structureScope.kind === "groupedColumnCell"
          ? currentDisplayTo
          : undefined,
      )
    ) {
      setPendingPanelAction({ type: "close" });
      setUnsavedReason("structurePanel");
      setUnsavedChangesOpen(true);
      return false;
    }

    setStructurePanelSession(null);
  }, []);

  const openStructurePanelAt = useCallback(
    (
      target: ItemListPanelTarget,
      label: string,
      scope: ItemListStructureScope,
    ) => {
      const currentEditor = editorRef.current;
      const baseline = readScopeLayoutSnapshot(currentEditor, scope);
      const session: ItemListPanelSession = {
        target,
        label,
        structureScope: scope,
        baseline,
        groupedColumnLabelBaseline: readGroupedColumnLabelBaseline(
          currentEditor,
          scope,
        ),
        groupedColumnDisplayFromBaseline: readGroupedColumnDisplayFromBaseline(
          currentEditor,
          scope,
        ),
        groupedColumnDisplayToBaseline: readGroupedColumnDisplayToBaseline(
          currentEditor,
          scope,
        ),
      };
      structurePanelSessionRef.current = session;
      setStructurePanelSession(session);

      const contextValue = contextValueRef.current;
      if (!contextValue) {
        return;
      }

      openThirdRail({
        title: label,
        headerActions: <ItemListThirdRailHeaderActions />,
        body: <ItemListThirdRailBody />,
        footer: <ItemListThirdRailFooter />,
        resizeContent: true,
        onClose: guardStructurePanelClose,
      });
    },
    [guardStructurePanelClose, openThirdRail],
  );

  const switchStructurePanel = useCallback(
    (
      target: ItemListPanelTarget,
      label: string,
      scope: ItemListStructureScope,
    ) => {
      const currentEditor = editorRef.current;
      const baseline = readScopeLayoutSnapshot(currentEditor, scope);
      const session: ItemListPanelSession = {
        target,
        label,
        structureScope: scope,
        baseline,
        groupedColumnLabelBaseline: readGroupedColumnLabelBaseline(
          currentEditor,
          scope,
        ),
        groupedColumnDisplayFromBaseline: readGroupedColumnDisplayFromBaseline(
          currentEditor,
          scope,
        ),
        groupedColumnDisplayToBaseline: readGroupedColumnDisplayToBaseline(
          currentEditor,
          scope,
        ),
      };
      structurePanelSessionRef.current = session;
      setStructurePanelSession(session);

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

  const executePendingPanelAction = useCallback(
    (action: ItemListPanelPendingAction) => {
      if (action.type === "close") {
        closeStructurePanel();
        return;
      }

      switchStructurePanel(action.target, action.label, action.structureScope);
    },
    [closeStructurePanel, switchStructurePanel],
  );

  const requestStructurePanel = useCallback(
    (
      target: ItemListPanelTarget,
      label: string,
      scope: ItemListStructureScope,
    ) => {
      if (!structurePanelSession) {
        openStructurePanelAt(target, label, scope);
        return;
      }

      if (areItemListPanelTargetsEqual(structurePanelSession.target, target)) {
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
          structureScope: scope,
        });
        setUnsavedReason("structurePanel");
        setUnsavedChangesOpen(true);
        return;
      }

      switchStructurePanel(target, label, scope);
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
      requestStructurePanel({ kind: "row", rowRef }, label, structureScope);
    },
    [requestStructurePanel, structureScope],
  );

  const requestComponentColumnPanel = useCallback(
    (columnRef: ComponentColumnRef, label: string) => {
      requestStructurePanel(
        { kind: "column", columnRef },
        label,
        structureScope,
      );
    },
    [requestStructurePanel, structureScope],
  );

  const requestGroupedColumnPanel = useCallback(
    (columnIndex: number, label: string) => {
      requestStructurePanel({ kind: "groupedColumn", columnIndex }, label, {
        kind: "groupedColumnCell",
        columnIndex,
      });
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
    if (!structurePanelSession || !currentScopedLayoutSnapshot) {
      closeStructurePanel();
      return;
    }

    const savedSession: ItemListPanelSession = {
      ...structurePanelSession,
      baseline: currentScopedLayoutSnapshot,
      groupedColumnLabelBaseline: currentGroupedColumnLabel,
      groupedColumnDisplayFromBaseline: currentGroupedColumnDisplayFrom,
      groupedColumnDisplayToBaseline: currentGroupedColumnDisplayTo,
    };
    structurePanelSessionRef.current = savedSession;
    setStructurePanelSession(savedSession);
    closeStructurePanel();
  }, [
    closeStructurePanel,
    currentGroupedColumnDisplayFrom,
    currentGroupedColumnDisplayTo,
    currentGroupedColumnLabel,
    currentScopedLayoutSnapshot,
    structurePanelSession,
  ]);

  const requestTabChange = useCallback(
    (tabId: ItemListDesignerTabId) => {
      if (!isItemListDesignerTabId(tabId) || tabId === activeTabId) {
        return;
      }

      if (
        shouldConfirmTabChange(
          activeTabId,
          tabId,
          settingsIsDirty,
          designIsDirty,
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
      designIsDirty,
      navigateToTab,
      settingsIsDirty,
      structurePanelSession,
    ],
  );

  const requestColumnsScopeChange = useCallback(
    (scope: ItemListColumnsScope) => {
      if (scope === columnsScope) {
        return;
      }

      if (structurePanelSession && structurePanelIsDirty) {
        setPendingColumnsScope(scope);
        setUnsavedReason("columnsScope");
        setUnsavedChangesOpen(true);
        return;
      }

      if (structurePanelSession) {
        closeStructurePanel();
      }

      navigateToColumnsScope(scope);
    },
    [
      closeStructurePanel,
      columnsScope,
      navigateToColumnsScope,
      structurePanelIsDirty,
      structurePanelSession,
    ],
  );

  const confirmUnsavedSave = useCallback(async () => {
    if (unsavedReason === "structurePanel") {
      const action = pendingPanelAction;
      if (!action || !structurePanelSession || !currentScopedLayoutSnapshot) {
        setUnsavedChangesOpen(false);
        return;
      }

      const savedSession: ItemListPanelSession = {
        ...structurePanelSession,
        baseline: currentScopedLayoutSnapshot,
        groupedColumnLabelBaseline: currentGroupedColumnLabel,
        groupedColumnDisplayFromBaseline: currentGroupedColumnDisplayFrom,
        groupedColumnDisplayToBaseline: currentGroupedColumnDisplayTo,
      };
      structurePanelSessionRef.current = savedSession;
      setStructurePanelSession(savedSession);
      setUnsavedChangesOpen(false);
      setPendingPanelAction(null);
      setUnsavedReason(null);
      executePendingPanelAction(action);
      return;
    }

    if (unsavedReason === "columnsScope") {
      const nextScope = pendingColumnsScope;
      if (
        !nextScope ||
        !structurePanelSession ||
        !currentScopedLayoutSnapshot
      ) {
        setUnsavedChangesOpen(false);
        return;
      }

      const savedSession: ItemListPanelSession = {
        ...structurePanelSession,
        baseline: currentScopedLayoutSnapshot,
        groupedColumnLabelBaseline: currentGroupedColumnLabel,
        groupedColumnDisplayFromBaseline: currentGroupedColumnDisplayFrom,
        groupedColumnDisplayToBaseline: currentGroupedColumnDisplayTo,
      };
      structurePanelSessionRef.current = savedSession;
      setStructurePanelSession(savedSession);
      closeStructurePanel();
      setUnsavedChangesOpen(false);
      setPendingColumnsScope(null);
      setUnsavedReason(null);
      navigateToColumnsScope(nextScope);
      return;
    }

    const tabId = unsavedTabId;
    const nextTabId = pendingTabId;
    if (!tabId || !nextTabId) {
      return;
    }

    const error =
      tabId === "design"
        ? editor.viewType === "card"
          ? await saveLayout()
          : await saveColumns()
        : await saveSettings();
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
    currentGroupedColumnDisplayFrom,
    currentGroupedColumnDisplayTo,
    currentGroupedColumnLabel,
    currentScopedLayoutSnapshot,
    editor.viewType,
    executePendingPanelAction,
    navigateToColumnsScope,
    navigateToTab,
    pendingColumnsScope,
    pendingPanelAction,
    pendingTabId,
    saveColumns,
    saveLayout,
    saveSettings,
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

    if (unsavedReason === "columnsScope") {
      const nextScope = pendingColumnsScope;
      const session = structurePanelSession;
      if (!nextScope || !session) {
        setUnsavedChangesOpen(false);
        return;
      }

      applyPanelSessionSnapshot(editor, session);
      closeStructurePanel();
      setUnsavedChangesOpen(false);
      setPendingColumnsScope(null);
      setUnsavedReason(null);
      navigateToColumnsScope(nextScope);
      return;
    }

    const tabId = unsavedTabId;
    const nextTabId = pendingTabId;
    if (!tabId || !nextTabId) {
      return;
    }

    if (tabId === "design") {
      if (editor.viewType === "card") {
        discardLayout();
      } else {
        discardColumns();
      }
    } else {
      discardSettings();
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
    discardColumns,
    discardLayout,
    discardSettings,
    editor,
    executePendingPanelAction,
    navigateToColumnsScope,
    navigateToTab,
    pendingColumnsScope,
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
    setPendingColumnsScope(null);
    setUnsavedReason(null);
  }, []);

  const contextValue = useMemo(
    (): ItemListDesignerContextValue => ({
      editor,
      previewItem: isLoading && !previewItem ? null : previewItem,
      canSave,
      previewBreakpoint,
      setPreviewBreakpoint,
      previewMobileDeviceId,
      setPreviewMobileDeviceId,
      previewColorScheme,
      setPreviewColorScheme,
      activeTabId,
      settingsIsDirty,
      columnsIsDirty,
      layoutIsDirty,
      unsavedTabId,
      unsavedReason,
      saveSettings,
      discardSettings,
      saveColumns,
      discardColumns,
      saveLayout,
      discardLayout,
      requestTabChange,
      unsavedChangesOpen,
      confirmUnsavedSave,
      confirmUnsavedDiscard,
      cancelUnsavedChanges,
      columnsScope,
      requestColumnsScopeChange,
      activeGroupedColumnIndex,
      setActiveGroupedColumnIndex,
      structureScope,
      structurePanelOpen: structurePanelSession != null,
      structurePanelIsDirty,
      selectedStructureRowRef,
      selectedStructureColumnRef,
      selectedGroupedColumnIndex,
      requestComponentRowPanel,
      requestComponentColumnPanel,
      requestGroupedColumnPanel,
      requestCloseStructurePanel,
      commitStructurePanelSave,
    }),
    [
      activeGroupedColumnIndex,
      activeTabId,
      cancelUnsavedChanges,
      canSave,
      columnsIsDirty,
      columnsScope,
      commitStructurePanelSave,
      confirmUnsavedDiscard,
      confirmUnsavedSave,
      discardColumns,
      discardLayout,
      discardSettings,
      editor,
      isLoading,
      layoutIsDirty,
      previewBreakpoint,
      previewColorScheme,
      previewItem,
      previewMobileDeviceId,
      requestCloseStructurePanel,
      requestColumnsScopeChange,
      requestComponentColumnPanel,
      requestComponentRowPanel,
      requestGroupedColumnPanel,
      requestTabChange,
      saveColumns,
      saveLayout,
      saveSettings,
      selectedGroupedColumnIndex,
      selectedStructureColumnRef,
      selectedStructureRowRef,
      settingsIsDirty,
      structurePanelIsDirty,
      structurePanelSession,
      structureScope,
      unsavedChangesOpen,
      unsavedReason,
      unsavedTabId,
    ],
  );

  contextValueRef.current = contextValue;

  itemListDesignerThirdRail.publish({
    contextValue,
    session: structurePanelSession,
  });

  return (
    <ItemListDesignerContext.Provider value={contextValue}>
      {children}
    </ItemListDesignerContext.Provider>
  );
}
