function formatPrice(price: number): string {
  return price.toLocaleString("es-ES", {
    minimumFractionDigits: 2,
  });
}

type OrderItem = {
  name: string;
  quantity: number;
  price: number;
  notes?: string;
};

export type CustomerInfo = {
  name: string;
  phone: string;
  deliveryType: "delivery" | "pickup";
  address?: string;
  neighborhood?: string;
  reference?: string;
  notes?: string;
  paymentMethod: "cash" | "transfer" | "cod";
  cashAmount?: string;
};

const SEP = "─".repeat(28);

const paymentLabel: Record<string, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  cod: "Pago contra entrega",
};

export function buildWhatsAppMessage(
  businessName: string,
  items: OrderItem[],
  subtotal: number,
  customer: CustomerInfo,
): string {
  const lines: string[] = [];

  lines.push(`Hola 👋`);
  lines.push(`Quisiera realizar el siguiente pedido en *${businessName}*:`);
  lines.push("");
  lines.push(SEP);

  items.forEach((item) => {
    lines.push(`*${item.quantity}x ${item.name}*`);
    lines.push(`   $${formatPrice(item.price * item.quantity)}`);
    if (item.notes) {
      lines.push(`   📝 ${item.notes}`);
    }
    lines.push(SEP);
  });

  lines.push("");
  lines.push(`*Subtotal:* $${formatPrice(subtotal)}`);
  lines.push("");
  lines.push(SEP);
  lines.push("");
  lines.push(`*Datos del cliente*`);
  lines.push(`👤 Nombre: ${customer.name}`);
  lines.push(`📱 Teléfono: ${customer.phone}`);
  lines.push("");

  if (customer.deliveryType === "delivery") {
    lines.push(`🚚 Entrega: *Delivery*`);
    if (customer.address) lines.push(`📍 Dirección: ${customer.address}`);
    if (customer.neighborhood) lines.push(`🏘️ Barrio: ${customer.neighborhood}`);
    if (customer.reference) lines.push(`🗺️ Referencia: ${customer.reference}`);
  } else {
    lines.push(`🏪 Entrega: *Retiro en tienda*`);
  }

  lines.push("");
  lines.push(`💳 Pago: ${paymentLabel[customer.paymentMethod] ?? customer.paymentMethod}`);
  if (customer.paymentMethod === "cash" && customer.cashAmount) {
    lines.push(`   Pagaré con: $${customer.cashAmount}`);
  }

  if (customer.notes) {
    lines.push("");
    lines.push(`📋 Notas: ${customer.notes}`);
  }

  lines.push("");
  lines.push(SEP);
  lines.push("Muchas gracias. 🙏");

  return lines.join("\n");
}

export function getWhatsAppLink(phone: string, message: string): string {
  const cleaned = phone.replace(/[^0-9]/g, "");
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
}
