import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart-context";
import { buildWhatsAppMessage, getWhatsAppLink } from "@/lib/whatsapp";
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
          name: i.product.name,
          quantity: i.quantity,
          price: i.product.sale_price ?? i.product.price,
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
      location.href = getWhatsAppLink(waPhone, message);
      try {
        await supabase.rpc("create_order", {
          p_business_id: business.id,
          p_customer_name: data.name,
          p_customer_phone: data.phone,
          p_customer_address: data.address || "",
          p_notes: data.notes || null,
          p_items: items.map((i) => ({
            product_id: i.product.id,
            product_name: i.product.name,
            quantity: i.quantity,
          })),
        });
        clearCart();
      } catch (err) {
        console.error("Error creating order:", err);
      } finally {
        setBusy(false);
      }
    },
    [business, items, subtotal, clearCart],
  );

  return { handleCheckout, busy, error };
}
