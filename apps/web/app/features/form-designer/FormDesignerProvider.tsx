import { ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS } from "@repo/entities";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useSearchParams } from "react-router";

import { useAnyPermission } from "../../auth/useAnyPermission";
import type { EntityName } from "../../entities/entity-catalog";
import { useEntityDefinition } from "../../entities/entity-catalog-context";
import {
  DEFAULT_LAYOUT_PREVIEW_BREAKPOINT,
  type LayoutPreviewBreakpoint,
} from "../ui-builder/LayoutPreviewPanel";
import { useEntityFormLayoutEditor } from "../ui-builder/use-entity-form-layout-editor";
import {
  FORM_DESIGNER_TAB_SEARCH_PARAM,
  isFormDesignerTabId,
  parseFormDesignerTabId,
  type FormDesignerTabId,
} from "./form-designer-tabs";
import {
  applySettingsSnapshotToEditor,
  areSettingsSnapshotsEqual,
  readSettingsSnapshot,
  readSettingsSnapshotFromDefinition,
  type FormDesignerSettingsSnapshot,
} from "./form-designer-settings";

interface FormDesignerContextValue {
  readonly editor: ReturnType<typeof useEntityFormLayoutEditor>;
  readonly canSave: boolean;
  readonly previewBreakpoint: LayoutPreviewBreakpoint;
  readonly setPreviewBreakpoint: (breakpoint: LayoutPreviewBreakpoint) => void;
  readonly activeTabId: FormDesignerTabId;
  readonly settingsIsDirty: boolean;
  readonly saveSettings: () => Promise<string | null>;
  readonly discardSettings: () => void;
  readonly requestTabChange: (tabId: FormDesignerTabId) => void;
  readonly unsavedChangesOpen: boolean;
  readonly pendingTabId: FormDesignerTabId | null;
  readonly confirmUnsavedSave: () => Promise<void>;
  readonly confirmUnsavedDiscard: () => void;
  readonly cancelUnsavedChanges: () => void;
  readonly overlayPreviewOpen: boolean;
  readonly openOverlayPreview: () => void;
  readonly closeOverlayPreview: () => void;
}

const FormDesignerContext = createContext<FormDesignerContextValue | null>(null);

function shouldBlockTabChange(
  fromTab: FormDesignerTabId,
  settingsIsDirty: boolean,
  toTab: FormDesignerTabId,
): boolean {
  return fromTab !== toTab && fromTab === "settings" && settingsIsDirty;
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
  readonly children: ReactNode;
}

export function FormDesignerProvider({
  entityName,
  children,
}: FormDesignerProviderProps) {
  const editor = useEntityFormLayoutEditor(entityName);
  const definition = useEntityDefinition(entityName);
  const canSave = useAnyPermission(ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS);
  const [searchParams, setSearchParams] = useSearchParams();
  const [previewBreakpoint, setPreviewBreakpoint] =
    useState<LayoutPreviewBreakpoint>(DEFAULT_LAYOUT_PREVIEW_BREAKPOINT);
  const [savedSettingsBaseline, setSavedSettingsBaseline] =
    useState<FormDesignerSettingsSnapshot>(() =>
      readSettingsSnapshotFromDefinition(definition),
    );
  const [unsavedChangesOpen, setUnsavedChangesOpen] = useState(false);
  const [pendingTabId, setPendingTabId] = useState<FormDesignerTabId | null>(
    null,
  );
  const [overlayPreviewOpen, setOverlayPreviewOpen] = useState(false);

  const activeTabId = useMemo(
    () => parseFormDesignerTabId(searchParams.get(FORM_DESIGNER_TAB_SEARCH_PARAM)),
    [searchParams],
  );

  useEffect(() => {
    setSavedSettingsBaseline(readSettingsSnapshotFromDefinition(definition));
  }, [definition]);

  const currentSettingsSnapshot = useMemo(
    () => readSettingsSnapshot(editor),
    [
      editor.presentation,
      editor.modalSize,
      editor.modalChrome.showHeader,
      editor.modalChrome.contentPadding,
      editor.modalFooterLayout,
    ],
  );

  const settingsIsDirty = useMemo(
    () =>
      !areSettingsSnapshotsEqual(
        savedSettingsBaseline,
        currentSettingsSnapshot,
      ),
    [currentSettingsSnapshot, savedSettingsBaseline],
  );

  const navigateToTab = useCallback(
    (tabId: FormDesignerTabId) => {
      setSearchParams(applyTabToSearchParams(searchParams, tabId), {
        replace: true,
      });
    },
    [searchParams, setSearchParams],
  );

  const saveSettings = useCallback(async (): Promise<string | null> => {
    const error = await editor.save();
    if (!error) {
      setSavedSettingsBaseline(readSettingsSnapshot(editor));
    }
    return error;
  }, [editor]);

  const discardSettings = useCallback(() => {
    applySettingsSnapshotToEditor(editor, savedSettingsBaseline);
  }, [editor, savedSettingsBaseline]);

  const requestTabChange = useCallback(
    (tabId: FormDesignerTabId) => {
      if (!isFormDesignerTabId(tabId) || tabId === activeTabId) {
        return;
      }

      if (shouldBlockTabChange(activeTabId, settingsIsDirty, tabId)) {
        setPendingTabId(tabId);
        setUnsavedChangesOpen(true);
        return;
      }

      navigateToTab(tabId);
    },
    [activeTabId, navigateToTab, settingsIsDirty],
  );

  const confirmUnsavedSave = useCallback(async () => {
    const pending = pendingTabId;
    if (!pending) {
      setUnsavedChangesOpen(false);
      return;
    }

    const error = await saveSettings();
    if (error) {
      return;
    }

    setUnsavedChangesOpen(false);
    setPendingTabId(null);
    navigateToTab(pending);
  }, [navigateToTab, pendingTabId, saveSettings]);

  const confirmUnsavedDiscard = useCallback(() => {
    const pending = pendingTabId;
    if (!pending) {
      setUnsavedChangesOpen(false);
      return;
    }

    discardSettings();
    setUnsavedChangesOpen(false);
    setPendingTabId(null);
    navigateToTab(pending);
  }, [discardSettings, navigateToTab, pendingTabId]);

  const cancelUnsavedChanges = useCallback(() => {
    setUnsavedChangesOpen(false);
    setPendingTabId(null);
  }, []);

  const openOverlayPreview = useCallback(() => {
    setOverlayPreviewOpen(true);
  }, []);

  const closeOverlayPreview = useCallback(() => {
    setOverlayPreviewOpen(false);
  }, []);

  const value = useMemo(
    (): FormDesignerContextValue => ({
      editor,
      canSave,
      previewBreakpoint,
      setPreviewBreakpoint,
      activeTabId,
      settingsIsDirty,
      saveSettings,
      discardSettings,
      requestTabChange,
      unsavedChangesOpen,
      pendingTabId,
      confirmUnsavedSave,
      confirmUnsavedDiscard,
      cancelUnsavedChanges,
      overlayPreviewOpen,
      openOverlayPreview,
      closeOverlayPreview,
    }),
    [
      activeTabId,
      cancelUnsavedChanges,
      canSave,
      closeOverlayPreview,
      confirmUnsavedDiscard,
      confirmUnsavedSave,
      discardSettings,
      editor,
      openOverlayPreview,
      overlayPreviewOpen,
      pendingTabId,
      previewBreakpoint,
      requestTabChange,
      saveSettings,
      settingsIsDirty,
      unsavedChangesOpen,
    ],
  );

  return (
    <FormDesignerContext.Provider value={value}>
      {children}
    </FormDesignerContext.Provider>
  );
}

export function useFormDesigner(): FormDesignerContextValue {
  const context = useContext(FormDesignerContext);
  if (!context) {
    throw new Error("useFormDesigner must be used within FormDesignerProvider");
  }
  return context;
}
