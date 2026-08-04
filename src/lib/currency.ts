const CURRENCY_SYMBOL: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  CNY: "¥",
  KRW: "₩",
  INR: "₹",
  CAD: "C$",
  AUD: "A$",
  CHF: "Fr",
  BRL: "R$",
  MXN: "$",
  ARS: "$",
  CLP: "$",
  COP: "$",
  PEN: "S/",
  UYU: "$",
  PYG: "₲",
  BOB: "Bs",
  VES: "Bs",
  NIO: "C$",
  CRC: "₡",
  GTQ: "Q",
  HNL: "L",
  DOP: "RD$",
  PAB: "B/.",
};

export function getCurrencySymbol(currency: string): string {
  return CURRENCY_SYMBOL[currency] || "$";
}

export const CURRENCY_OPTIONS = [
  "USD",
  "EUR",
  "MXN",
  "ARS",
  "CLP",
  "COP",
  "PEN",
  "UYU",
  "BRL",
  "GBP",
  "CAD",
  "JPY",
  "PYG",
  "BOB",
  "CRC",
  "GTQ",
  "HNL",
  "DOP",
  "NIO",
  "PAB",
  "VES",
] as const;

export function getCurrencyLabel(code: string): string {
  return `${getCurrencySymbol(code)} ${code}`;
}
