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
      className="flex items-center bg-[#FAFAFA] border border-[#E5E7EB] rounded-[14px] h-[56px] w-[130px] shrink-0 p-1"
      role="spinbutton"
      aria-label="Cantidad"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={quantity}
    >
      <button
        onClick={() => onChange(Math.max(min, quantity - 1))}
        disabled={quantity <= min}
        className="w-10 h-full flex items-center justify-center text-[#6B7280] hover:text-[#111827] hover:bg-gray-100 rounded-[10px] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Restar uno"
      >
        <Minus className="size-[14px]" strokeWidth={1.5} />
      </button>
      <span className="flex-1 text-center font-bold text-lg tabular-nums">{quantity}</span>
      <button
        onClick={() => onChange(Math.min(max, quantity + 1))}
        disabled={quantity >= max}
        className="w-10 h-full flex items-center justify-center text-[#6B7280] hover:text-[#111827] hover:bg-gray-100 rounded-[10px] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Sumar uno"
      >
        <Plus className="size-[14px]" strokeWidth={1.5} />
      </button>
    </div>
  );
}
