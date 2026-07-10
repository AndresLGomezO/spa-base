import { NotificationsMenu } from "./NotificationsMenu";
import { useNotifications } from "./notifications-context";

export function NotificationBell() {
  const { isPanelOpen, setPanelOpen } = useNotifications();

  return (
    <NotificationsMenu
      placement="right-start"
      fullWidth
      showLabel
      useSidebarButtonStyle
      open={isPanelOpen}
      onOpenChange={setPanelOpen}
    />
  );
}
