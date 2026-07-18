const CURRENCY_SYMBOL: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  MXN: "$",
  COP: "$",
  BRL: "R$",
};

export function getCurrencySymbol(currency: string): string {
  return CURRENCY_SYMBOL[currency] || "$";
}

export function formatPrice(price: number): string {
  return price.toLocaleString("es-ES", {
    minimumFractionDigits: 2,
  });
}
