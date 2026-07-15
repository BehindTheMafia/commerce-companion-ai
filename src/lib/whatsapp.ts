function formatPrice(price: number): string {
  return price.toLocaleString("es-ES", {
    minimumFractionDigits: 0,
  });
}

type OrderItem = {
  name: string;
  quantity: number;
  price: number;
};

type CustomerInfo = {
  name: string;
  phone: string;
  address: string;
  notes?: string;
};

export function buildWhatsAppMessage(
  businessName: string,
  items: OrderItem[],
  subtotal: number,
  customer: CustomerInfo,
): string {
  const lines: string[] = [];
  lines.push(`🛒 *Pedido - ${businessName}*`);
  lines.push("");

  items.forEach((item) => {
    lines.push(
      `• ${item.name} x${item.quantity} — $${formatPrice(item.price * item.quantity)}`,
    );
  });

  lines.push("");
  lines.push(`*Total: $${formatPrice(subtotal)}*`);
  lines.push("");
  lines.push("━━━━━━━━━━━━");
  lines.push("👤 *Cliente*");
  lines.push(`Nombre: ${customer.name}`);
  lines.push(`Teléfono: ${customer.phone}`);
  lines.push(`Dirección: ${customer.address}`);
  if (customer.notes) {
    lines.push(`Notas: ${customer.notes}`);
  }

  return lines.join("\n");
}

export function getWhatsAppLink(phone: string, message: string): string {
  const cleaned = phone.replace(/[^0-9]/g, "");
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
}
