interface ThirdRailSyncStore<TSnapshot> {
  readonly publish: (snapshot: TSnapshot) => void;
  readonly subscribe: (listener: () => void) => () => void;
  readonly getSnapshot: () => TSnapshot;
}

export function createThirdRailSyncStore<TSnapshot>(
  initial: TSnapshot,
): ThirdRailSyncStore<TSnapshot> {
  let snapshot = initial;
  const listeners = new Set<() => void>();
  let notifyScheduled = false;

  function notifyListeners(): void {
    notifyScheduled = false;
    for (const listener of listeners) {
      listener();
    }
  }

  function scheduleNotifyListeners(): void {
    if (notifyScheduled || listeners.size === 0) {
      return;
    }

    notifyScheduled = true;
    queueMicrotask(notifyListeners);
  }

  return {
    publish(next) {
      snapshot = next;
      scheduleNotifyListeners();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot() {
      return snapshot;
    },
  };
}

interface SplitThirdRailSyncStore<TContext, TSession> {
  readonly publish: (snapshot: {
    readonly contextValue: TContext | null;
    readonly session: TSession | null;
  }) => void;
  readonly subscribeContext: (listener: () => void) => () => void;
  readonly subscribeSession: (listener: () => void) => () => void;
  readonly getContextSnapshot: () => TContext | null;
  readonly getSessionSnapshot: () => TSession | null;
}

export function createSplitThirdRailSyncStore<TContext, TSession>(initial: {
  readonly contextValue: TContext | null;
  readonly session: TSession | null;
}): SplitThirdRailSyncStore<TContext, TSession> {
  let contextValue = initial.contextValue;
  let session = initial.session;
  const contextListeners = new Set<() => void>();
  const sessionListeners = new Set<() => void>();
  let notifyScheduled = false;
  let pendingContextNotify = false;
  let pendingSessionNotify = false;

  function notifyListeners(): void {
    notifyScheduled = false;
    if (pendingContextNotify) {
      pendingContextNotify = false;
      for (const listener of contextListeners) {
        listener();
      }
    }
    if (pendingSessionNotify) {
      pendingSessionNotify = false;
      for (const listener of sessionListeners) {
        listener();
      }
    }
  }

  function scheduleNotify(changed: "context" | "session" | "both"): void {
    if (changed === "context" || changed === "both") {
      pendingContextNotify = true;
    }
    if (changed === "session" || changed === "both") {
      pendingSessionNotify = true;
    }

    if (notifyScheduled) {
      return;
    }

    notifyScheduled = true;
    queueMicrotask(notifyListeners);
  }

  return {
    publish(next) {
      const sessionChanged = next.session !== session;
      const contextChanged = next.contextValue !== contextValue;
      contextValue = next.contextValue;
      session = next.session;

      if (sessionChanged && contextChanged) {
        scheduleNotify("both");
        return;
      }
      if (sessionChanged) {
        scheduleNotify("session");
        return;
      }
      if (contextChanged) {
        scheduleNotify("context");
      }
    },
    subscribeContext(listener) {
      contextListeners.add(listener);
      return () => {
        contextListeners.delete(listener);
      };
    },
    subscribeSession(listener) {
      sessionListeners.add(listener);
      return () => {
        sessionListeners.delete(listener);
      };
    },
    getContextSnapshot() {
      return contextValue;
    },
    getSessionSnapshot() {
      return session;
    },
  };
}
