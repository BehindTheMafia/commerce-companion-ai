import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCart } from "@/lib/cart-context";
import type { Business } from "@/types/storefront";

type StoreHeaderProps = {
  business: Business;
  slug: string;
  onCartOpen?: () => void;
  actions?: React.ReactNode;
};

export function StoreHeader({ business, slug, onCartOpen, actions }: StoreHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const { itemCount } = useCart();

  useEffect(() => {
    const handler = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full transition-all duration-300 bg-background/95 backdrop-blur-xl",
        isScrolled ? "shadow-sm border-b border-border/50" : "border-b border-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5 md:px-8 lg:px-12">
        <Link to="/go/$slug" params={{ slug }} className="flex items-center gap-2.5 group">
          {business.logo_url ? (
            <img
              src={business.logo_url}
              alt={business.name}
              className="size-8 rounded-lg object-cover ring-1 ring-border/50 transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
              <ShoppingBag className="size-4" />
            </div>
          )}
          <span className="text-lg font-semibold tracking-tight text-foreground">
            {business.name}
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {actions}
          <button
            onClick={onCartOpen}
            className="relative text-muted-foreground hover:text-foreground transition-colors p-2 rounded-full hover:bg-muted/50"
            aria-label={`Carrito (${itemCount} productos)`}
          >
            <ShoppingBag className="size-5" strokeWidth={1.5} />
            {itemCount > 0 && (
              <span className="absolute top-1 right-1 grid min-w-[16px] h-4 place-items-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground px-1">
                {itemCount > 99 ? "99+" : itemCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
