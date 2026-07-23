import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";

import {
  resolveTimeRangeBounds,
  type TimeRangeBounds,
  type TimeRangeSelection,
} from "@repo/ui";

import {
  debuggerTimeSelectionKey,
  getBrowserTimeZone,
  parseDebuggerTimeSelection,
  parseDebuggerTimeZone,
  writeDebuggerTimeSelection,
  writeDebuggerTimeZone,
} from "./debugger-time-range-url";

export function useDebuggerTimeRange(): {
  readonly selection: TimeRangeSelection;
  readonly setSelection: (selection: TimeRangeSelection) => void;
  readonly timeZone: string;
  readonly setTimeZone: (timeZone: string) => void;
  readonly selectionKey: string;
  readonly resolveBounds: (now?: Date) => TimeRangeBounds;
} {
  const [searchParams, setSearchParams] = useSearchParams();
  const browserTimeZone = useMemo(() => getBrowserTimeZone(), []);

  const selection = useMemo(
    () => parseDebuggerTimeSelection(searchParams),
    [searchParams],
  );

  const timeZone = useMemo(
    () => parseDebuggerTimeZone(searchParams, browserTimeZone),
    [browserTimeZone, searchParams],
  );

  const selectionKey = useMemo(
    () => debuggerTimeSelectionKey(selection),
    [selection],
  );

  const resolveBounds = useCallback(
    (now: Date = new Date()) =>
      resolveTimeRangeBounds(selection, now, timeZone),
    [selection, timeZone],
  );

  const updateParams = useCallback(
    (updater: (next: URLSearchParams) => void) => {
      const next = new URLSearchParams(searchParams);
      updater(next);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const setSelection = useCallback(
    (nextSelection: TimeRangeSelection) => {
      updateParams((next) => {
        writeDebuggerTimeSelection(next, nextSelection);
      });
    },
    [updateParams],
  );

  const setTimeZone = useCallback(
    (nextTimeZone: string) => {
      updateParams((next) => {
        writeDebuggerTimeZone(next, nextTimeZone, browserTimeZone);
      });
    },
    [browserTimeZone, updateParams],
  );

  return {
    selection,
    setSelection,
    timeZone,
    setTimeZone,
    selectionKey,
    resolveBounds,
  };
}
