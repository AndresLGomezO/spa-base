import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";

import {
  ThirdRailContext,
  type OpenThirdRailOptions,
  type ThirdRailContextValue,
} from "./third-rail-context";

const DEFAULT_CLOSE_LABEL = "Close panel";

/**
 * Global third-rail state. Mount once in the app shell and render
 * `ThirdRailHost` as a flex sibling of the main content column.
 *
 * @example
 * const { open, close } = useThirdRail();
 * open({ title: "Edit", body: <Form />, footer: <Actions /> });
 */
export function ThirdRailProvider({
  children,
}: {
  readonly children: ReactNode;
}) {
  const [options, setOptions] = useState<OpenThirdRailOptions | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const close = useCallback(() => {
    const current = optionsRef.current;
    current?.onClose?.();
    setOptions(null);
  }, []);

  const open = useCallback((next: OpenThirdRailOptions) => {
    setOptions({
      resizeContent: true,
      closeLabel: DEFAULT_CLOSE_LABEL,
      ...next,
    });
  }, []);

  const update = useCallback((patch: Partial<OpenThirdRailOptions>) => {
    setOptions((current) => {
      if (!current) {
        return current;
      }

      return { ...current, ...patch };
    });
  }, []);

  const value = useMemo<ThirdRailContextValue>(
    () => ({
      isOpen: options !== null,
      options,
      open,
      close,
      update,
    }),
    [close, open, options, update],
  );

  return (
    <ThirdRailContext.Provider value={value}>
      {children}
    </ThirdRailContext.Provider>
  );
}
