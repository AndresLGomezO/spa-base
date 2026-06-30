import { useCallback, useMemo } from "react";
import {
  useLocation,
  useNavigate,
  type Location,
  type NavigateFunction,
} from "react-router";

import type { EntityName } from "../entities/entity-catalog";

export interface EntityReturnToState {
  readonly returnTo?: string;
}

export function buildEntityListPath(entityName: EntityName): string {
  return `/app/${entityName}`;
}

export function buildCurrentReturnTo(
  location: Pick<Location, "pathname" | "search">,
): string {
  return `${location.pathname}${location.search}`;
}

export function isSafeAppReturnTo(path: string): boolean {
  if (!path.startsWith("/app/")) {
    return false;
  }

  if (path.includes("://") || path.startsWith("//")) {
    return false;
  }

  return true;
}

export function readReturnToFromLocation(
  location: Pick<Location, "state">,
): string | undefined {
  const state = location.state as EntityReturnToState | null | undefined;
  const returnTo = state?.returnTo;
  if (typeof returnTo !== "string" || returnTo.length === 0) {
    return undefined;
  }

  return isSafeAppReturnTo(returnTo) ? returnTo : undefined;
}

export function resolveEntityReturnTo(
  location: Pick<Location, "pathname" | "search" | "state">,
  entityName: EntityName,
): string {
  return readReturnToFromLocation(location) ?? buildEntityListPath(entityName);
}

function navigateToEntityDetail(
  navigate: NavigateFunction,
  entityName: EntityName,
  recordId: string,
  returnTo: string,
): void {
  navigate(`/app/${entityName}/${recordId}`, {
    state: {
      returnTo: isSafeAppReturnTo(returnTo)
        ? returnTo
        : buildEntityListPath(entityName),
    },
  });
}

function resolveEntityListModalBasePath(
  entityName: EntityName,
  returnTo: string,
): { readonly pathname: string; readonly params: URLSearchParams } {
  const pathname = buildEntityListPath(entityName);

  if (!isSafeAppReturnTo(returnTo)) {
    return { pathname, params: new URLSearchParams() };
  }

  const questionIndex = returnTo.indexOf("?");
  const returnPathname =
    questionIndex === -1 ? returnTo : returnTo.slice(0, questionIndex);
  const search = questionIndex === -1 ? "" : returnTo.slice(questionIndex + 1);

  if (returnPathname === pathname) {
    return { pathname, params: new URLSearchParams(search) };
  }

  return { pathname, params: new URLSearchParams() };
}

export function buildEntityListEditPath(
  entityName: EntityName,
  recordId: string,
  returnTo: string,
): string {
  const { pathname, params } = resolveEntityListModalBasePath(
    entityName,
    returnTo,
  );

  params.delete("create");
  params.set("edit", recordId);

  const query = params.toString();
  return query.length > 0
    ? `${pathname}?${query}`
    : `${pathname}?edit=${recordId}`;
}

export function buildEntityListCreatePath(
  entityName: EntityName,
  returnTo: string,
  prefill?: Readonly<Record<string, string>>,
): string {
  const { pathname, params } = resolveEntityListModalBasePath(
    entityName,
    returnTo,
  );

  params.delete("edit");
  params.append("create", "");

  if (prefill) {
    for (const [fieldName, value] of Object.entries(prefill)) {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        params.set(fieldName, trimmed);
      }
    }
  }

  const query = params.toString();
  return query.length > 0 ? `${pathname}?${query}` : `${pathname}?create`;
}

export function useEntityReturnNavigation(entityName: EntityName) {
  const navigate = useNavigate();
  const location = useLocation();

  const listReturnTo = useMemo(
    () => buildCurrentReturnTo(location),
    [location],
  );

  const returnTo = useMemo(
    () => resolveEntityReturnTo(location, entityName),
    [entityName, location],
  );

  const navigateToDetail = useCallback(
    (recordId: string) => {
      navigateToEntityDetail(navigate, entityName, recordId, listReturnTo);
    },
    [entityName, listReturnTo, navigate],
  );

  const navigateBack = useCallback(() => {
    navigate(returnTo);
  }, [navigate, returnTo]);

  const buildEditPath = useCallback(
    (recordId: string) =>
      buildEntityListEditPath(entityName, recordId, returnTo),
    [entityName, returnTo],
  );

  return {
    returnTo,
    listReturnTo,
    navigateToDetail,
    navigateBack,
    buildEditPath,
  };
}
