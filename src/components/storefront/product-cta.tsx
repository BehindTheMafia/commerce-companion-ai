import { ShoppingBag } from "lucide-react";

type ProductCTAProps = {
  label: string;
  totalPrice: string;
  onClick: () => void;
  disabled?: boolean;
};

export function ProductCTA({ label, totalPrice, onClick, disabled }: ProductCTAProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex-1 bg-[#111827] text-white rounded-[14px] h-[56px] font-bold text-[15px] flex items-center justify-center gap-3 hover:bg-black hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
    >
      <ShoppingBag className="size-[18px]" strokeWidth={1.5} />
      <span>{label}</span>
      <span className="size-1 bg-white/40 rounded-full" />
      <span>{totalPrice}</span>
    </button>
  );
}
