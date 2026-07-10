import { sidebarMenuButtonClassName } from "@repo/ui";

import { UserProfileMenu } from "../user/UserProfileMenu";

export function SidebarUser() {
  return (
    <UserProfileMenu
      placement="right-start"
      fullWidth
      triggerClassName={sidebarMenuButtonClassName({ size: "lg" })}
      textClassName="text-sidebar-foreground"
      hideTextClassName="group-data-[collapsible=icon]/sidebar:hidden"
    />
  );
}
