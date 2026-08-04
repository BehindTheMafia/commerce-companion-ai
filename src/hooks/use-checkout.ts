import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart-context";
import { buildWhatsAppMessage, getWhatsAppLink } from "@/lib/whatsapp";
import { sendPushForOrder } from "@/lib/push/client-api";
import type { Business } from "@/types/storefront";
import type { CustomerData } from "@/components/storefront/checkout-form";

export function useCheckout(business: Business | null | undefined) {
  const { items, clearCart, subtotal } = useCart();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = useCallback(
    async (data: CustomerData) => {
      if (!business) return;
      const waPhone = business.whatsapp_phone;
      if (!waPhone) {
        setError("El negocio no tiene configurado un numero de WhatsApp.");
        return;
      }
      setBusy(true);
      setError(null);

      const message = buildWhatsAppMessage(
        business.name,
        items.map((i) => ({
          name:
            i.product.name + (i.product.pricingModeName ? ` (${i.product.pricingModeName})` : ""),
          quantity: i.quantity,
          price: i.product.unitPrice ?? i.product.sale_price ?? i.product.price,
          notes: i.notes,
        })),
        subtotal,
        {
          name: data.name,
          phone: data.phone,
          deliveryType: data.deliveryType,
          address: data.address || undefined,
          neighborhood: data.neighborhood || undefined,
          reference: data.reference || undefined,
          notes: data.notes || undefined,
          paymentMethod: data.paymentMethod,
          cashAmount: data.cashAmount || undefined,
        },
      );

      try {
        // Persist the order first so it is never lost to the WhatsApp navigation.
        const { data: created, error: createError } = await supabase.rpc("create_order", {
          p_business_id: business.id,
          p_customer_name: data.name,
          p_customer_phone: data.phone,
          p_customer_address: data.address || "",
          p_notes: data.notes || undefined,
          p_items: items.map((i) => ({
            product_id: i.product.id,
            product_name:
              i.product.name + (i.product.pricingModeName ? ` (${i.product.pricingModeName})` : ""),
            quantity: i.quantity,
          })),
        });

        if (createError) {
          console.error("Error creating order:", createError);
        } else if (created && typeof created === "object" && "id" in created) {
          // Fire-and-forget: tell the backend to push new-order notifications to
          // every admin device. keepalive survives the navigation below.
          void sendPushForOrder((created as { id: string }).id);
          clearCart();
        }
      } catch (err) {
        console.error("Error creating order:", err);
      } finally {
        setBusy(false);
      }

      location.href = getWhatsAppLink(waPhone, message);
    },
    [business, items, subtotal, clearCart],
  );

  return { handleCheckout, busy, error };
}
