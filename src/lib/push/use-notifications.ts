import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/lib/business-context";
import {
  ensureDeviceRegistered,
  getNotificationPermission,
  isPushSupported,
  registerServiceWorker,
  requestNotificationPermission,
} from "./manager";
import { getNotificationPreferences, upsertNotificationPreferences } from "./preferences";
import { unlockAudio } from "./order-sound";
import type { NotificationPreferences, NotificationPromptStatus } from "./types";

const SESSION_DISMISSED_KEY = "hyperbee_push_banner_dismissed";

export type UseNotificationsResult = {
  supported: boolean;
  permission: NotificationPermission;
  promptStatus: NotificationPromptStatus;
  prefs: NotificationPreferences | null;
  registering: boolean;
  shouldShowPrompt: boolean;
  shouldShowBanner: boolean;
  enableNotifications: () => Promise<void>;
  disableNotifications: () => Promise<void>;
  dismissBanner: () => void;
  reloadPreferences: () => void;
};

function readSessionDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(SESSION_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Manages push notification lifecycle for the logged-in admin:
 *  - registers the service worker
 *  - shows a one-time opt-in prompt per (user, business)
 *  - auto-registers devices once permission is granted
 *  - surfaces an elegant re-enable banner when permission is denied
 */
export function useNotifications(): UseNotificationsResult {
  const { activeBusiness } = useBusiness();
  const [userId, setUserId] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [swRegistered, setSwRegistered] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [sessionDismissed, setSessionDismissed] = useState(readSessionDismissed);
  const promptShownRef = useRef(false);

  const supported = isPushSupported();
  const businessId = activeBusiness?.id ?? null;

  const { data: prefs, refetch } = useQuery<NotificationPreferences | null>({
    queryKey: ["notification-preferences", userId, businessId],
    enabled: !!userId && !!businessId,
    queryFn: async () => {
      if (!userId || !businessId) return null;
      return getNotificationPreferences(userId, businessId);
    },
    staleTime: 30_000,
  });

  // Register the service worker once per session.
  useEffect(() => {
    if (!supported) return;
    let mounted = true;
    registerServiceWorker().then((ok) => {
      if (mounted) setSwRegistered(ok);
    });
    return () => {
      mounted = false;
    };
  }, [supported]);

  // Unlock the Web Audio context on the first user interaction so order chimes
  // can play without violating browser autoplay policies.
  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    window.addEventListener("touchstart", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, []);

  // Track auth state.
  useEffect(() => {
    if (typeof Notification !== "undefined") {
      setPermission(Notification.permission);
    }
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setUserId(session?.user?.id ?? null);
      if (event === "SIGNED_OUT") {
        setPermission("default");
      } else if (typeof Notification !== "undefined") {
        setPermission(Notification.permission);
      }
    });
    void supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id ?? null);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  // Auto-register this device when the user already granted permission
  // (covers returning admins and browser "previously allowed" states).
  useEffect(() => {
    if (!supported || !swRegistered) return;
    if (permission !== "granted") return;
    const status = prefs?.prompt_status ?? "never_asked";
    if (status === "denied" || status === "blocked") return;
    if (!userId || !businessId) return;
    void ensureDeviceRegistered(businessId);
  }, [supported, swRegistered, permission, prefs?.prompt_status, userId, businessId]);

  // Re-register when the browser rotates its push subscription.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onChanged = () => {
      if (permission === "granted" && userId && businessId) {
        void ensureDeviceRegistered(businessId);
      }
    };
    navigator.serviceWorker.addEventListener("pushsubscriptionchange", onChanged);
    return () => {
      navigator.serviceWorker.removeEventListener("pushsubscriptionchange", onChanged);
    };
  }, [permission, userId, businessId]);

  const promptStatus: NotificationPromptStatus = prefs?.prompt_status ?? "never_asked";
  const prefsLoaded = prefs !== undefined;

  const shouldShowPrompt =
    supported &&
    !!userId &&
    !!businessId &&
    prefsLoaded &&
    !registering &&
    !sessionDismissed &&
    !promptShownRef.current &&
    promptStatus === "never_asked" &&
    permission !== "denied";

  // Once rendered, the dialog won't reappear mid-session until reload.
  useEffect(() => {
    if (shouldShowPrompt) promptShownRef.current = true;
  }, [shouldShowPrompt]);

  const shouldShowBanner =
    supported &&
    !!userId &&
    !!businessId &&
    prefsLoaded &&
    !shouldShowPrompt &&
    !sessionDismissed &&
    ((permission === "denied" && promptStatus !== "accepted") ||
      (promptStatus === "denied" && permission !== "granted"));

  const enableNotifications = useCallback(async () => {
    if (!userId || !businessId) return;
    setRegistering(true);
    try {
      const perm = await requestNotificationPermission();
      setPermission(perm);
      if (perm === "granted") {
        await ensureDeviceRegistered(businessId);
        await upsertNotificationPreferences(userId, businessId, {
          new_orders_enabled: true,
          sound_enabled: true,
          prompt_status: "accepted",
        });
      } else {
        await upsertNotificationPreferences(userId, businessId, {
          prompt_status: perm === "denied" ? "blocked" : "denied",
        });
      }
      await refetch();
    } finally {
      setRegistering(false);
    }
  }, [userId, businessId, refetch]);

  const disableNotifications = useCallback(async () => {
    if (!userId || !businessId) return;
    setSessionDismissed(true);
    await upsertNotificationPreferences(userId, businessId, {
      new_orders_enabled: false,
      prompt_status: "denied",
    });
    await refetch();
  }, [userId, businessId, refetch]);

  const dismissBanner = useCallback(() => {
    setSessionDismissed(true);
  }, []);

  return {
    supported,
    permission,
    promptStatus,
    prefs: prefs ?? null,
    registering,
    shouldShowPrompt,
    shouldShowBanner,
    enableNotifications,
    disableNotifications,
    dismissBanner,
    reloadPreferences: refetch,
  };
}
