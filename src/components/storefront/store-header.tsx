import { useState, useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { Search, ShoppingBag, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCart } from "@/lib/cart-context";
import type { Business } from "@/types/storefront";

type CategoryNav = {
  id: string;
  name: string;
};

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
  categories?: CategoryNav[];
  selectedCategory?: string | null;
  onSelectCategory?: (name: string | null) => void;
};

function Pill({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200",
        active
          ? "bg-foreground text-background shadow-md shadow-black/5"
          : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function StoreHeader({
  business,
  slug,
  onCartOpen,
  actions,
  search,
  categories = [],
  selectedCategory,
  onSelectCategory,
}: StoreHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { itemCount } = useCart();

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
        "sticky top-0 z-40 w-full bg-background/95 backdrop-blur-xl transition-all duration-300 supports-[backdrop-filter]:bg-background/85",
        isScrolled ? "border-b border-border/50 shadow-sm" : "border-b border-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5 md:px-8 lg:px-12">
        <Link to="/go/$slug" params={{ slug }} className="group flex items-center gap-2.5">
          {business.logo_url ? (
            <img
              src={business.logo_url}
              alt={business.name}
              className="size-8 rounded-lg object-cover ring-1 ring-border/50 transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
              <ShoppingBag className="size-4" strokeWidth={2} />
            </div>
          )}
          <span className="max-w-[180px] truncate font-display text-lg font-bold tracking-tight text-foreground sm:max-w-[280px]">
            {business.name}
          </span>
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {actions}
          {search && (
            <button
              onClick={search.onToggle}
              aria-label="Buscar"
              className="rounded-full p-2 text-muted-foreground transition-all hover:bg-muted/50 hover:text-foreground"
            >
              <Search className="size-5" strokeWidth={1.75} />
            </button>
          )}
          <button
            onClick={onCartOpen}
            className="relative rounded-full p-2 text-muted-foreground transition-all hover:bg-muted/50 hover:text-foreground"
            aria-label={`Carrito (${itemCount} productos)`}
          >
            <ShoppingBag className="size-5" strokeWidth={1.75} />
            {itemCount > 0 && (
              <span className="absolute right-0.5 top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full border-2 border-background bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {itemCount > 99 ? "99+" : itemCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {search && (
        <div
          className={cn(
            "overflow-hidden transition-all duration-300 ease-in-out",
            search.open ? "max-h-24 border-t border-border/50 opacity-100" : "max-h-0 opacity-0",
          )}
        >
          <div className="bg-background/95 px-5 py-3 md:px-8 lg:px-12">
            <div className="mx-auto flex h-11 max-w-2xl items-center gap-2 rounded-full border border-border/50 bg-muted/50 px-4 transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
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

      {categories.length > 0 && onSelectCategory && (
        <div className="border-t border-border/40 bg-background/50">
          <div className="mx-auto max-w-[1440px] px-5 md:px-8 lg:px-12">
            <div className="no-scrollbar flex gap-2 overflow-x-auto py-3 [-webkit-overflow-scrolling:touch]">
              <Pill active={!selectedCategory} onClick={() => onSelectCategory(null)}>
                Todos
              </Pill>
              {categories.map((cat) => (
                <Pill
                  key={cat.id}
                  active={selectedCategory === cat.name}
                  onClick={() => onSelectCategory(selectedCategory === cat.name ? null : cat.name)}
                >
                  {cat.name}
                </Pill>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
