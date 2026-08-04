import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { playOrderSound } from "@/lib/push/order-sound";
import { NewOrderToastContent } from "@/components/admin/new-order-toast";
import type { RealtimeOrder } from "@/lib/push/types";

const GROUP_WINDOW_MS = 2500; // aggregate rapid orders into a single toast
const MAX_REMEMBERED_ORDERS = 200;

/**
 * Subscribes to Supabase Realtime (Postgres Changes on `orders`) and turns new
 * orders into the premium in-app experience while the admin panel is open:
 * grouped glassmorphism toast + short chime + automatic dashboard refresh.
 */
export function useRealtimeOrders(options: {
  businessId: string | null;
  soundEnabled?: boolean;
  enabled?: boolean;
}): void {
  const { businessId, soundEnabled = true, enabled = true } = options;
  const queryClient = useQueryClient();

  const bufferRef = useRef<RealtimeOrder[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seenRef = useRef(new Set<string>());
  // Keep the latest flush logic in a ref so the realtime subscription callback
  // always sees the current `soundEnabled` / `queryClient` values.
  const flushRef = useRef<() => void>(() => {});

  flushRef.current = () => {
    const batch = bufferRef.current;
    bufferRef.current = [];
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (batch.length === 0) return;

    if (soundEnabled) {
      try {
        playOrderSound();
      } catch {
        // never let audio break the order flow
      }
    }

    // Refresh everything that depends on orders without reloading the page.
    if (businessId) {
      void queryClient.invalidateQueries({ queryKey: ["orders", businessId] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-stats", businessId] });
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
    }

    if (batch.length === 1) {
      showSingleToast(batch[0]);
    } else {
      showGroupedToast(batch);
    }
  };

  const pushOrder = (order: RealtimeOrder) => {
    if (!order?.id) return;
    if (seenRef.current.has(order.id)) return;
    seenRef.current.add(order.id);
    if (seenRef.current.size > MAX_REMEMBERED_ORDERS) {
      // keep the dedupe set bounded
      const iterator = seenRef.current.values();
      for (let i = 0; i < seenRef.current.size - MAX_REMEMBERED_ORDERS; i++) {
        seenRef.current.delete(iterator.next().value as string);
      }
    }

    bufferRef.current.push(order);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => flushRef.current(), GROUP_WINDOW_MS);
  };

  useEffect(() => {
    if (!businessId || !enabled) return;

    const channel = supabase
      .channel(`orders-realtime:${businessId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `business_id=eq.${businessId}`,
        },
        (payload) => {
          pushOrder(payload.new as RealtimeOrder);
        },
      )
      .subscribe();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      bufferRef.current = [];
      void supabase.removeChannel(channel);
    };
  }, [businessId, enabled]);
}

function showSingleToast(order: RealtimeOrder): void {
  toast.custom((t) => <NewOrderToastContent toastId={t} order={order} />, {
    position: "top-right",
    duration: 7000,
    className: "max-w-sm",
  });
}

function showGroupedToast(batch: RealtimeOrder[]): void {
  toast.custom((t) => <NewOrderToastContent toastId={t} orders={batch} />, {
    position: "top-right",
    duration: 8000,
    className: "max-w-sm",
  });
}
