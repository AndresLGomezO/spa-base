import type {
  DashboardDateFilterConfig,
  ViewFilterDateGranularity,
} from "@repo/ui-builder-core";
import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";

function padTwo(value: number): string {
  return String(value).padStart(2, "0");
}

export function getCurrentDateBucket(
  granularity: ViewFilterDateGranularity,
): string {
  return getRelativeDateBucket(granularity, 0);
}

/**
 * Returns a period bucket relative to "now".
 * `offset` is in units of the granularity (e.g. -1 = last month / yesterday / last year).
 */
export function getRelativeDateBucket(
  granularity: ViewFilterDateGranularity,
  offset: number,
): string {
  const now = new Date();

  switch (granularity) {
    case "year":
      return String(now.getFullYear() + offset);
    case "month": {
      const date = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      return `${date.getFullYear()}-${padTwo(date.getMonth() + 1)}`;
    }
    case "day": {
      const date = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + offset,
      );
      return `${date.getFullYear()}-${padTwo(date.getMonth() + 1)}-${padTwo(date.getDate())}`;
    }
  }
}

export function parseDateFilterParam(
  raw: string | null,
  granularity: ViewFilterDateGranularity,
): string | null {
  if (!raw?.trim()) {
    return null;
  }

  const trimmed = raw.trim();

  switch (granularity) {
    case "year": {
      const match = /^(\d{4})$/.exec(trimmed);
      return match ? trimmed : null;
    }
    case "month": {
      const match = /^(\d{4})-(\d{2})$/.exec(trimmed);
      if (!match) {
        return null;
      }
      const month = Number(match[2]);
      return month >= 1 && month <= 12 ? trimmed : null;
    }
    case "day": {
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
      if (!match) {
        return null;
      }
      const month = Number(match[2]);
      const day = Number(match[3]);
      if (month < 1 || month > 12 || day < 1 || day > 31) {
        return null;
      }
      return trimmed;
    }
  }
}

export function applyDateFilterToSearchParams(
  searchParams: URLSearchParams,
  param: string,
  granularity: ViewFilterDateGranularity,
  value: string,
): URLSearchParams {
  const next = new URLSearchParams(searchParams);

  if (value === getCurrentDateBucket(granularity)) {
    next.delete(param);
  } else {
    next.set(param, value);
  }

  return next;
}

export interface DashboardDateFilterState {
  readonly config: DashboardDateFilterConfig | null;
  readonly value: string;
  readonly setValue: (value: string) => void;
  readonly isExplicit: boolean;
}

export function useDashboardDateFilterUrlState(
  config: DashboardDateFilterConfig | null,
): DashboardDateFilterState {
  const [searchParams, setSearchParams] = useSearchParams();

  const explicitValue = useMemo(() => {
    if (!config) {
      return null;
    }

    return parseDateFilterParam(
      searchParams.get(config.param),
      config.granularity,
    );
  }, [config, searchParams]);

  const value = useMemo(() => {
    if (!config) {
      return "";
    }

    return explicitValue ?? getCurrentDateBucket(config.granularity);
  }, [config, explicitValue]);

  const setValue = useCallback(
    (nextValue: string) => {
      if (!config) {
        return;
      }

      const parsed = parseDateFilterParam(nextValue, config.granularity);
      if (!parsed) {
        return;
      }

      setSearchParams(
        (prev) =>
          applyDateFilterToSearchParams(
            prev,
            config.param,
            config.granularity,
            parsed,
          ),
        { replace: true },
      );
    },
    [config, setSearchParams],
  );

  return {
    config,
    value,
    setValue,
    isExplicit: explicitValue !== null,
  };
}
