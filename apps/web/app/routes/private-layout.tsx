import { Outlet } from "react-router";

import { SidebarProvider } from "@repo/ui";

import { RequireAuth } from "../auth/AuthGuards";
import { AppHeader, AppSidebar } from "../components/sidebar/AppSidebar";

export default function PrivateLayoutRoute() {
  return (
    <RequireAuth>
      <SidebarProvider>
        <div className="flex min-h-dvh">
          <AppSidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <AppHeader />
            <main className="flex-1 p-6">
              <Outlet />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </RequireAuth>
  );
}
