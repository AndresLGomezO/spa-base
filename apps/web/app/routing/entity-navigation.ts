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

export function buildEntityListEditPath(
  entityName: EntityName,
  recordId: string,
  returnTo: string,
): string {
  const basePath = isSafeAppReturnTo(returnTo)
    ? returnTo
    : buildEntityListPath(entityName);
  const questionIndex = basePath.indexOf("?");
  const pathname =
    questionIndex === -1 ? basePath : basePath.slice(0, questionIndex);
  const search = questionIndex === -1 ? "" : basePath.slice(questionIndex + 1);
  const params = new URLSearchParams(search);

  params.delete("create");
  params.set("edit", recordId);

  const query = params.toString();
  return query.length > 0
    ? `${pathname}?${query}`
    : `${pathname}?edit=${recordId}`;
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
