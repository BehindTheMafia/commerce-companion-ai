import { cn } from "@/lib/utils";

type ProductShippingProps = {
  text: string;
  freeThreshold: number | null;
  currencySymbol: string;
};

export function ProductShipping({ text, freeThreshold, currencySymbol: $ }: ProductShippingProps) {
  if (!text) return null;

  return (
    <div className="mt-6 flex items-center gap-3 text-xs text-muted-foreground">
      <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-40" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary opacity-70" />
      </span>
      {text}
      {freeThreshold != null && ` en pedidos mayores a ${$}${freeThreshold.toFixed(0)}`}
    </div>
  );
}
