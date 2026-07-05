import {
  memo,
  useSyncExternalStore,
  type Context,
  type ReactNode,
} from "react";

import { createSplitThirdRailSyncStore } from "./third-rail-sync-store";

interface DesignerThirdRailSnapshot<TContext, TSession> {
  readonly contextValue: TContext | null;
  readonly session: TSession | null;
}

interface DesignerThirdRailKit<TContext, TSession> {
  readonly publish: (
    snapshot: DesignerThirdRailSnapshot<TContext, TSession>,
  ) => void;
  readonly HeaderActions: () => ReactNode;
  readonly Body: () => ReactNode;
  readonly Footer: () => ReactNode;
}

export function createDesignerThirdRailKit<TContext, TSession>(options: {
  readonly Context: Context<TContext | null>;
  readonly renderContent: (session: TSession) => {
    readonly headerActions?: ReactNode;
    readonly body: ReactNode;
    readonly footer: ReactNode;
  };
}): DesignerThirdRailKit<TContext, TSession> {
  const store = createSplitThirdRailSyncStore<TContext, TSession>({
    contextValue: null,
    session: null,
  });

  function useContextSnapshot(): TContext | null {
    return useSyncExternalStore(
      store.subscribeContext,
      store.getContextSnapshot,
      store.getContextSnapshot,
    );
  }

  function useSessionSnapshot(): TSession | null {
    return useSyncExternalStore(
      store.subscribeSession,
      store.getSessionSnapshot,
      store.getSessionSnapshot,
    );
  }

  function ContextBridge({ children }: { readonly children: ReactNode }) {
    const contextValue = useContextSnapshot();
    if (!contextValue) {
      return null;
    }

    return (
      <options.Context.Provider value={contextValue}>
        {children}
      </options.Context.Provider>
    );
  }

  const PanelBody = memo(function PanelBody({
    session,
  }: {
    readonly session: TSession;
  }) {
    const { body } = options.renderContent(session);
    return body;
  });

  const PanelHeaderActions = memo(function PanelHeaderActions({
    session,
  }: {
    readonly session: TSession;
  }) {
    const { headerActions } = options.renderContent(session);
    return headerActions ?? null;
  });

  const PanelFooter = memo(function PanelFooter({
    session,
  }: {
    readonly session: TSession;
  }) {
    const { footer } = options.renderContent(session);
    return footer;
  });

  const BodyShell = memo(function BodyShell({
    session,
  }: {
    readonly session: TSession;
  }) {
    return (
      <ContextBridge>
        <PanelBody session={session} />
      </ContextBridge>
    );
  });

  function HeaderActions() {
    const session = useSessionSnapshot();
    const contextValue = useContextSnapshot();
    if (!session || !contextValue) {
      return null;
    }

    return (
      <ContextBridge>
        <PanelHeaderActions session={session} />
      </ContextBridge>
    );
  }

  function Body() {
    const session = useSessionSnapshot();
    if (!session) {
      return null;
    }

    return <BodyShell session={session} />;
  }

  function Footer() {
    const session = useSessionSnapshot();
    const contextValue = useContextSnapshot();
    if (!session || !contextValue) {
      return null;
    }

    return (
      <ContextBridge>
        <PanelFooter session={session} />
      </ContextBridge>
    );
  }

  return {
    publish: store.publish,
    HeaderActions,
    Body,
    Footer,
  };
}
