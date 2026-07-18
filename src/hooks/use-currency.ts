import { useMemo } from "react";
import { getCurrencySymbol } from "@/lib/currency";

export function useCurrency(currency: string) {
  const symbol = useMemo(() => getCurrencySymbol(currency), [currency]);

  const format = useMemo(() => (price: number) => `${symbol}${price.toFixed(2)}`, [symbol]);

  return { symbol, format };
}
