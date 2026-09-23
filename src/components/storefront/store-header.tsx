import { useState, useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { Search, ShoppingBag, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCart } from "@/lib/cart-context";
import { getWhatsAppLink } from "@/lib/whatsapp";
import { WhatsAppIcon } from "@/components/storefront/whatsapp-icon";
import type { Business } from "@/types/storefront";

type StoreHeaderProps = {
  business: Business;
  slug: string;
  onCartOpen?: () => void;
  actions?: React.ReactNode;
  search?: {
    open: boolean;
    query: string;
    onToggle: () => void;
    onQueryChange: (q: string) => void;
  };
};

export function StoreHeader({ business, slug, onCartOpen, actions, search }: StoreHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { itemCount } = useCart();
  const waPhone = business.whatsapp_phone;

  useEffect(() => {
    const handler = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    if (search?.open && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [search?.open]);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-xl transition-all duration-300 supports-[backdrop-filter]:bg-background/70",
        isScrolled ? "border-border/60 py-2 shadow-sm shadow-black/5" : "border-transparent py-3",
      )}
    >
      <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-4 px-5 md:px-8 lg:px-12">
        <Link to="/go/$slug" params={{ slug }} className="group flex min-w-0 items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-2xl bg-foreground text-background shadow-md transition-transform group-hover:scale-105">
            {business.logo_url ? (
              <img src={business.logo_url} alt={business.name} className="size-full object-cover" />
            ) : (
              <ShoppingBag className="size-5" strokeWidth={2} />
            )}
          </div>
          <span className="truncate font-display text-lg font-bold tracking-tight text-foreground">
            {business.name}
          </span>
        </Link>

        {search && (
          <div className="hidden flex-1 md:block">
            <div className="mx-auto flex h-11 max-w-md items-center gap-2.5 rounded-2xl border border-transparent bg-muted/60 px-4 transition-all focus-within:border-foreground/20 focus-within:bg-white focus-within:ring-2 focus-within:ring-foreground/10">
              <Search className="size-4 shrink-0 text-muted-foreground" strokeWidth={2} />
              <input
                type="search"
                value={search.query}
                onChange={(e) => search.onQueryChange(e.target.value)}
                placeholder="Buscar productos, marcas y más..."
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              {search.query && (
                <button
                  onClick={() => search.onQueryChange("")}
                  aria-label="Limpiar búsqueda"
                  className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-1.5 sm:gap-2">
          {actions}
          {search && (
            <button
              onClick={search.onToggle}
              aria-label="Buscar"
              className="rounded-full p-2 text-muted-foreground transition-all hover:bg-muted/60 hover:text-foreground md:hidden"
            >
              <Search className="size-5" strokeWidth={1.75} />
            </button>
          )}
          {waPhone && (
            <a
              href={getWhatsAppLink(waPhone, `Hola, quiero soporte de ${business.name}.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-2 rounded-xl bg-[#25D366]/10 px-3.5 py-2 text-sm font-semibold text-[#128C7E] transition-colors hover:bg-[#25D366]/20 sm:flex"
            >
              <WhatsAppIcon className="size-4 text-[#25D366]" />
              Soporte
            </a>
          )}
          <button
            onClick={onCartOpen}
            className="relative grid size-10 place-items-center rounded-2xl border border-border/60 bg-white text-foreground shadow-sm transition-all hover:border-foreground/20 hover:shadow-md active:scale-95"
            aria-label={`Carrito (${itemCount} productos)`}
          >
            <ShoppingBag className="size-5" strokeWidth={1.75} />
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full border-2 border-background bg-foreground px-1 text-[10px] font-bold text-background">
                {itemCount > 99 ? "99+" : itemCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {search && (
        <div
          className={cn(
            "overflow-hidden transition-all duration-300 ease-in-out md:hidden",
            search.open ? "max-h-24 border-t border-border/50 opacity-100" : "max-h-0 opacity-0",
          )}
        >
          <div className="bg-background/95 px-5 py-3">
            <div className="flex h-11 items-center gap-2 rounded-2xl border border-border/50 bg-muted/50 px-4 transition-all focus-within:border-foreground/20 focus-within:ring-2 focus-within:ring-foreground/10">
              <Search className="size-4 shrink-0 text-muted-foreground" strokeWidth={2} />
              <input
                ref={searchInputRef}
                type="search"
                value={search.query}
                onChange={(e) => search.onQueryChange(e.target.value)}
                placeholder="Buscar en la tienda..."
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              {search.query && (
                <button
                  onClick={() => search.onQueryChange("")}
                  className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
