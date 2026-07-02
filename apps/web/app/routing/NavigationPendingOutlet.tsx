import { Outlet, useNavigation } from "react-router";

import { EntityPageSkeleton } from "../components/loading/EntityPageSkeleton";

export function NavigationPendingOutlet() {
  const navigation = useNavigation();
  const isNavigating = navigation.state === "loading";

  if (isNavigating) {
    return <EntityPageSkeleton />;
  }

  return <Outlet />;
}
