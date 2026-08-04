const SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  NIO: "C$",
  MXN: "$",
  COP: "$",
  BRL: "R$",
  ARS: "$",
  CLP: "$",
  PEN: "S/",
  PYG: "₲",
  UYU: "$U",
  BOB: "Bs",
  CRC: "₡",
  GTQ: "Q",
  HNL: "L",
  PAB: "B/.",
  DOP: "RD$",
};

export function currencySymbol(currency: string): string {
  return SYMBOLS[currency.toUpperCase()] ?? currency + " ";
}

export function formatMoney(amount: number, currency: string): string {
  const symbol = currencySymbol(currency);
  const n = Number(amount ?? 0).toFixed(2);
  // Keep C$ and similar prefixes close to the number: C$1,250
  return `${symbol}${Number(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
