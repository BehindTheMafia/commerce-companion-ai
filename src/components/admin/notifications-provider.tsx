import type { ReactNode } from "react";
import { AnimatePresence } from "motion/react";
import { useBusiness } from "@/lib/business-context";
import { useNotifications } from "@/lib/push/use-notifications";
import { useRealtimeOrders } from "@/lib/realtime/use-realtime-orders";
import { NotificationPromptDialog } from "@/components/admin/notification-prompt-dialog";
import { NotificationBanner } from "@/components/admin/notification-banner";

/**
 * Mounted once inside the authenticated layout. Composes the two notification
 * systems:
 *   1. Realtime — instant toast + sound while the admin panel is open.
 *   2. Push — opt-in dialog, permission banner and device registration.
 */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { activeBusiness } = useBusiness();
  const notifications = useNotifications();

  useRealtimeOrders({
    businessId: activeBusiness?.id ?? null,
    soundEnabled: notifications.prefs?.sound_enabled ?? true,
    enabled: !!activeBusiness,
  });

  return (
    <>
      {children}

      <NotificationPromptDialog
        open={notifications.shouldShowPrompt}
        busy={notifications.registering}
        onEnable={() => void notifications.enableNotifications()}
        onDismiss={() => void notifications.disableNotifications()}
      />

      <AnimatePresence>
        {notifications.shouldShowBanner && (
          <NotificationBanner
            blocked={notifications.permission === "denied"}
            busy={notifications.registering}
            onEnable={() => void notifications.enableNotifications()}
            onDismiss={notifications.dismissBanner}
          />
        )}
      </AnimatePresence>
    </>
  );
}
