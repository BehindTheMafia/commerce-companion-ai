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
      className="flex-1 rounded-full text-background font-semibold text-sm tracking-[.04em] flex items-center justify-center gap-3 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 h-[60px] min-w-0"
      style={{
        background: "var(--color-foreground)",
        boxShadow: "0 10px 30px rgba(0,0,0,.12)",
      }}
    >
      <ShoppingBag className="size-4" strokeWidth={1.5} />
      <span>{label}</span>
      <span className="w-1 h-1 bg-background/40 rounded-full" />
      <span>{totalPrice}</span>
    </button>
  );
}
