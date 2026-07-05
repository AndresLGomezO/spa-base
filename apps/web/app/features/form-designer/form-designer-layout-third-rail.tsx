import { useSyncExternalStore, type ReactNode } from "react";

import { createThirdRailSyncStore } from "../ui-builder/third-rail-sync-store";
import {
  FormDesignerContext,
  type FormDesignerContextValue,
} from "./form-designer-context";
import { FormDesignerLayoutColumnPanel } from "./FormDesignerLayoutColumnPanel";
import { FormDesignerLayoutColumnPanelFooter } from "./FormDesignerLayoutColumnPanelFooter";
import { FormDesignerLayoutColumnPanelHeaderMenu } from "./FormDesignerLayoutColumnPanelHeaderMenu";
import { FormDesignerRootLayoutPanel } from "./FormDesignerRootLayoutPanel";
import { FormDesignerRootLayoutPanelFooter } from "./FormDesignerRootLayoutPanelFooter";

interface FormDesignerLayoutColumnPanelSession {
  readonly columnIndex: number;
}

interface FormDesignerRootLayoutPanelSession {
  readonly kind: "root";
}

type FormDesignerLayoutColumnRailSnapshot = {
  readonly contextValue: FormDesignerContextValue | null;
  readonly session: FormDesignerLayoutColumnPanelSession | null;
};

type FormDesignerRootLayoutRailSnapshot = {
  readonly contextValue: FormDesignerContextValue | null;
  readonly session: FormDesignerRootLayoutPanelSession | null;
};

const layoutColumnStore =
  createThirdRailSyncStore<FormDesignerLayoutColumnRailSnapshot>({
    contextValue: null,
    session: null,
  });

const rootLayoutStore =
  createThirdRailSyncStore<FormDesignerRootLayoutRailSnapshot>({
    contextValue: null,
    session: null,
  });

function useLayoutColumnSnapshot() {
  return useSyncExternalStore(
    layoutColumnStore.subscribe,
    layoutColumnStore.getSnapshot,
    layoutColumnStore.getSnapshot,
  );
}

function useRootLayoutSnapshot() {
  return useSyncExternalStore(
    rootLayoutStore.subscribe,
    rootLayoutStore.getSnapshot,
    rootLayoutStore.getSnapshot,
  );
}

function LayoutColumnContextBridge({
  children,
}: {
  readonly children: ReactNode;
}) {
  const { contextValue } = useLayoutColumnSnapshot();
  if (!contextValue) {
    return null;
  }

  return (
    <FormDesignerContext.Provider value={contextValue}>
      {children}
    </FormDesignerContext.Provider>
  );
}

function RootLayoutContextBridge({
  children,
}: {
  readonly children: ReactNode;
}) {
  const { contextValue } = useRootLayoutSnapshot();
  if (!contextValue) {
    return null;
  }

  return (
    <FormDesignerContext.Provider value={contextValue}>
      {children}
    </FormDesignerContext.Provider>
  );
}

function LayoutColumnHeaderActions() {
  const { session } = useLayoutColumnSnapshot();
  if (!session) {
    return null;
  }

  return (
    <LayoutColumnContextBridge>
      <FormDesignerLayoutColumnPanelHeaderMenu
        columnIndex={session.columnIndex}
      />
    </LayoutColumnContextBridge>
  );
}

function LayoutColumnBody() {
  const { session } = useLayoutColumnSnapshot();
  if (!session) {
    return null;
  }

  return (
    <LayoutColumnContextBridge>
      <FormDesignerLayoutColumnPanel columnIndex={session.columnIndex} />
    </LayoutColumnContextBridge>
  );
}

function LayoutColumnFooter() {
  const { session, contextValue } = useLayoutColumnSnapshot();
  if (!session || !contextValue) {
    return null;
  }

  return (
    <LayoutColumnContextBridge>
      <FormDesignerLayoutColumnPanelFooter />
    </LayoutColumnContextBridge>
  );
}

function RootLayoutBody() {
  const { session } = useRootLayoutSnapshot();
  if (!session) {
    return null;
  }

  return (
    <RootLayoutContextBridge>
      <FormDesignerRootLayoutPanel />
    </RootLayoutContextBridge>
  );
}

function RootLayoutFooter() {
  const { session, contextValue } = useRootLayoutSnapshot();
  if (!session || !contextValue) {
    return null;
  }

  return (
    <RootLayoutContextBridge>
      <FormDesignerRootLayoutPanelFooter />
    </RootLayoutContextBridge>
  );
}

export const formDesignerLayoutColumnThirdRail = {
  publish(snapshot: FormDesignerLayoutColumnRailSnapshot) {
    layoutColumnStore.publish(snapshot);
  },
  HeaderActions: LayoutColumnHeaderActions,
  Body: LayoutColumnBody,
  Footer: LayoutColumnFooter,
};

export const formDesignerRootLayoutThirdRail = {
  publish(snapshot: FormDesignerRootLayoutRailSnapshot) {
    rootLayoutStore.publish(snapshot);
  },
  Body: RootLayoutBody,
  Footer: RootLayoutFooter,
};
