import { Minus, Plus } from "lucide-react";

type ProductQuantityProps = {
  quantity: number;
  onChange: (qty: number) => void;
  min?: number;
  max?: number;
};

export function ProductQuantity({ quantity, onChange, min = 1, max = 99 }: ProductQuantityProps) {
  return (
    <div
      className="flex items-center border border-border/50 rounded-full justify-between px-1 bg-transparent shrink-0"
      role="spinbutton"
      aria-label="Cantidad"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={quantity}
    >
      <button
        onClick={() => onChange(Math.max(min, quantity - 1))}
        disabled={quantity <= min}
        className="grid size-12 place-items-center text-muted-foreground hover:text-foreground transition-colors rounded-full disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Restar uno"
      >
        <Minus className="size-4" strokeWidth={1.5} />
      </button>
      <span className="text-sm font-semibold tabular-nums -ml-2">{quantity}</span>
      <button
        onClick={() => onChange(Math.min(max, quantity + 1))}
        disabled={quantity >= max}
        className="grid size-12 place-items-center text-muted-foreground hover:text-foreground transition-colors rounded-full disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Sumar uno"
      >
        <Plus className="size-4" strokeWidth={1.5} />
      </button>
    </div>
  );
}
