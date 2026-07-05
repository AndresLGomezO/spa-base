import { useCallback, useMemo, useRef, useState } from "react";

interface BuilderPropertiesPanelSession<TSnapshot> {
  readonly label: string;
  readonly baseline: TSnapshot;
}

interface UseBuilderSessionOptions<TSnapshot> {
  readonly readCurrentSnapshot: () => TSnapshot;
  readonly areSnapshotsEqual: (left: TSnapshot, right: TSnapshot) => boolean;
  readonly initialBaseline: TSnapshot;
}

interface UseBuilderSessionResult<TSnapshot> {
  readonly savedBaseline: TSnapshot;
  readonly currentSnapshot: TSnapshot;
  readonly isDirty: boolean;
  readonly syncSavedBaseline: (snapshot?: TSnapshot) => void;
  readonly propertiesPanelSession: BuilderPropertiesPanelSession<TSnapshot> | null;
  readonly propertiesPanelOpen: boolean;
  readonly propertiesPanelIsDirty: boolean;
  readonly openPropertiesPanel: (label: string, baseline?: TSnapshot) => void;
  readonly closePropertiesPanel: () => void;
  readonly commitPropertiesPanelBaseline: () => void;
}

/**
 * Shared dirty-state + properties panel session for unified builder surfaces.
 */
export function useBuilderSession<TSnapshot>({
  readCurrentSnapshot,
  areSnapshotsEqual,
  initialBaseline,
}: UseBuilderSessionOptions<TSnapshot>): UseBuilderSessionResult<TSnapshot> {
  const readCurrentSnapshotRef = useRef(readCurrentSnapshot);
  readCurrentSnapshotRef.current = readCurrentSnapshot;

  const [savedBaseline, setSavedBaseline] = useState(initialBaseline);
  const [propertiesPanelSession, setPropertiesPanelSession] =
    useState<BuilderPropertiesPanelSession<TSnapshot> | null>(null);

  const currentSnapshot = useMemo(
    () => readCurrentSnapshot(),
    [readCurrentSnapshot],
  );

  const isDirty = useMemo(
    () => !areSnapshotsEqual(savedBaseline, currentSnapshot),
    [areSnapshotsEqual, currentSnapshot, savedBaseline],
  );

  const propertiesPanelOpen = propertiesPanelSession != null;

  const propertiesPanelIsDirty = useMemo(() => {
    if (!propertiesPanelSession) {
      return false;
    }

    return !areSnapshotsEqual(propertiesPanelSession.baseline, currentSnapshot);
  }, [areSnapshotsEqual, currentSnapshot, propertiesPanelSession]);

  const syncSavedBaseline = useCallback((snapshot?: TSnapshot) => {
    setSavedBaseline(snapshot ?? readCurrentSnapshotRef.current());
  }, []);

  const openPropertiesPanel = useCallback(
    (label: string, baseline?: TSnapshot) => {
      setPropertiesPanelSession({
        label,
        baseline: baseline ?? readCurrentSnapshotRef.current(),
      });
    },
    [],
  );

  const closePropertiesPanel = useCallback(() => {
    setPropertiesPanelSession(null);
  }, []);

  const commitPropertiesPanelBaseline = useCallback(() => {
    setPropertiesPanelSession((session) => {
      if (!session) {
        return null;
      }

      return {
        ...session,
        baseline: readCurrentSnapshotRef.current(),
      };
    });
  }, []);

  return {
    savedBaseline,
    currentSnapshot,
    isDirty,
    syncSavedBaseline,
    propertiesPanelSession,
    propertiesPanelOpen,
    propertiesPanelIsDirty,
    openPropertiesPanel,
    closePropertiesPanel,
    commitPropertiesPanelBaseline,
  };
}
