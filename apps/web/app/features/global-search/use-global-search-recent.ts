import { useCallback, useState } from "react";

import {
  pushGlobalSearchRecent,
  readGlobalSearchRecent,
  removeGlobalSearchRecent,
} from "./global-search-recent-storage";
import type {
  GlobalSearchHit,
  GlobalSearchRecentEntry,
} from "./global-search-types";

export function useGlobalSearchRecent(): {
  readonly recent: readonly GlobalSearchRecentEntry[];
  readonly remember: (hit: GlobalSearchHit) => void;
  readonly forget: (hitId: string) => void;
  readonly refresh: () => void;
} {
  const [recent, setRecent] = useState<readonly GlobalSearchRecentEntry[]>(() =>
    readGlobalSearchRecent(),
  );

  const refresh = useCallback(() => {
    setRecent(readGlobalSearchRecent());
  }, []);

  const remember = useCallback((hit: GlobalSearchHit) => {
    setRecent(pushGlobalSearchRecent(hit));
  }, []);

  const forget = useCallback((hitId: string) => {
    setRecent(removeGlobalSearchRecent(hitId));
  }, []);

  return { recent, remember, forget, refresh };
}
