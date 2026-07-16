function formatPrice(price: number): string {
  return price.toLocaleString("es-ES", {
    minimumFractionDigits: 2,
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
  const sep = "─".repeat(30);

  lines.push(`*${businessName.toUpperCase()}*`);
  lines.push(`*Nuevo Pedido*`);
  lines.push(sep);
  lines.push("");

  lines.push(`Producto              Cant.  Total`);
  lines.push(`──────────────────────────────`);

  items.forEach((item) => {
    const name = item.name.length > 17
      ? item.name.slice(0, 15) + ".."
      : item.name;
    const line = `${name.padEnd(22)} ${String(item.quantity).padStart(3)}   $${formatPrice(item.price * item.quantity)}`;
    lines.push(line);
  });

  lines.push(`──────────────────────────────`);
  lines.push(`*TOTAL*                $${formatPrice(subtotal)}`);
  lines.push("");
  lines.push(sep);

  lines.push(`*DATOS DEL CLIENTE*`);
  lines.push(`Nombre:    ${customer.name}`);
  lines.push(`Telefono:  ${customer.phone}`);
  lines.push(`Direccion: ${customer.address}`);
  if (customer.notes) {
    lines.push(`Notas:     ${customer.notes}`);
  }

  lines.push("");
  lines.push(sep);
  lines.push(`Gracias por tu preferencia.`);

  return lines.join("\n");
}

export function getWhatsAppLink(phone: string, message: string): string {
  const cleaned = phone.replace(/[^0-9]/g, "");
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
}
