import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, ShoppingBag, Sparkles, AlertCircle, Package,
  ArrowRight, ExternalLink, Search, Heart, Menu, Plus,
  Facebook, Twitter, Instagram,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { cn } from "@/lib/utils";


export const Route = createFileRoute("/go/$slug")({
  component: StorefrontPage,
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} | Commerce AI` },
      { name: "description", content: `Compra en ${params.slug} — productos con envío rápido y pago seguro.` },
      { property: "og:title", content: `${params.slug} | Commerce AI` },
      { property: "og:description", content: `Descubre los productos de ${params.slug}.` },
    ],
  }),
});

type Business = { id: string; name: string; slug: string; logo_url: string | null; currency: string };
type Category = { id: string; name: string; slug: string };
type Product = {
  id: string; name: string; slug: string; price: number;
  sale_price: number | null; image_url: string | null;
  description: string | null; stock: number;
  category: { name: string } | null;
};

const sym = (c: string) => ({ USD: "$", EUR: "€", GBP: "£", MXN: "$", COP: "$", BRL: "R$" }[c] || "$");

function StorefrontPage() {
  const { slug } = useParams({ from: "/go/$slug" });
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const { data: business, isLoading: bizLoading, error: bizError } = useQuery({
    queryKey: ["sf-business", slug],
    queryFn: async (): Promise<Business> => {
      const { data, error } = await supabase
        .from("businesses")
        .select("id, name, slug, logo_url, currency")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Business not found");
      return data;
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["sf-categories", business?.id],
    enabled: !!business,
    queryFn: async (): Promise<Category[]> => {
      const { data } = await supabase
        .from("categories")
        .select("id, name, slug")
        .eq("business_id", business!.id)
        .order("sort_order", { ascending: true });
      return data ?? [];
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["sf-products", business?.id],
    enabled: !!business,
    queryFn: async (): Promise<Product[]> => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, slug, price, sale_price, image_url, description, stock, category:categories(name)")
        .eq("business_id", business!.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (bizLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Sparkles className="size-6" />
          </div>
          <p className="mt-4 text-sm font-medium text-foreground">Cargando tienda...</p>
          <Loader2 className="mx-auto mt-2 size-4 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (bizError || !business) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
            <AlertCircle className="size-6" />
          </div>
          <h1 className="mt-4 text-xl font-semibold">Tienda no encontrada</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            La tienda que buscas no existe o ha sido removida.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary underline underline-offset-4"
          >
            Volver al inicio <ArrowRight className="size-3" />
          </Link>
        </div>
      </div>
    );
  }

  const currency = business.currency;
  const $ = sym(currency);
  const filtered = selectedCategory
    ? products.filter((p) => p.category?.name === selectedCategory)
    : products;

  const hasSale = (p: Product) => p.sale_price != null && p.sale_price < p.price;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* === Announcement Bar === */}
      <div className="bg-foreground text-background text-[11px] py-2 text-center tracking-wide font-light">
        <span className="opacity-90">
          <Sparkles className="mr-1.5 inline size-3 align-text-top opacity-70" />
          ENVÍO GRATIS EN PEDIDOS +{$}50 | CÓDIGO: <span className="font-medium text-primary">COMMERCE</span>
        </span>
      </div>

      {/* === Sticky Header === */}
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          {/* Mobile menu */}
          <button
            className="lg:hidden text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
          >
            <Menu className="size-5" strokeWidth={1.5} />
          </button>

          {/* Search (desktop) */}
          <div className="hidden lg:flex items-center gap-2 w-1/4">
            <Search className="size-4 text-muted-foreground/60" strokeWidth={1.5} />
            <input
              type="text"
              placeholder="Buscar productos..."
              className="bg-transparent text-xs text-muted-foreground placeholder-muted-foreground/40 focus:outline-none w-full font-light"
            />
          </div>

          {/* Logo / Brand */}
          <div className="flex items-center gap-3 text-center lg:w-auto">
            {business.logo_url && (
              <img src={business.logo_url} alt="" className="size-7 rounded-lg object-cover ring-1 ring-border/50" />
            )}
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {business.name}
            </span>
          </div>

          {/* Icons */}
          <div className="flex items-center justify-end gap-4 w-1/4">
            <button className="hidden lg:block text-muted-foreground hover:text-foreground transition-colors">
              <Heart className="size-4" strokeWidth={1.5} />
            </button>
            <button className="relative text-muted-foreground hover:text-foreground transition-colors">
              <ShoppingBag className="size-4" strokeWidth={1.5} />
              <span className="absolute -top-1.5 -right-1.5 grid size-3.5 place-items-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground">
                0
              </span>
            </button>
          </div>
        </div>

        {/* Desktop nav */}
        {categories.length > 0 && (
          <nav className="hidden lg:flex justify-center border-t border-border/40">
            <ul className="flex gap-8 text-[11px] tracking-widest font-normal text-muted-foreground/80 h-9 items-center">
              <li
                className={cn(
                  "cursor-pointer transition-colors",
                  !selectedCategory ? "text-foreground font-medium" : "hover:text-foreground"
                )}
                onClick={() => setSelectedCategory(null)}
              >
                TODO
              </li>
              {categories.map((cat) => (
                <li
                  key={cat.id}
                  className={cn(
                    "cursor-pointer transition-colors relative group",
                    selectedCategory === cat.name ? "text-foreground font-medium" : "hover:text-foreground"
                  )}
                  onClick={() => setSelectedCategory(selectedCategory === cat.name ? null : cat.name)}
                >
                  {cat.name}
                </li>
              ))}
            </ul>
          </nav>
        )}

        {/* Mobile nav */}
        {mobileNavOpen && categories.length > 0 && (
          <div className="border-t border-border/40 bg-background/95 backdrop-blur-xl lg:hidden">
            <div className="flex flex-wrap gap-2 px-4 py-3">
              <button
                onClick={() => { setSelectedCategory(null); setMobileNavOpen(false); }}
                className={cn(
                  "rounded-full border px-3 py-1 text-[11px] font-medium transition-colors",
                  !selectedCategory
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground"
                )}
              >
                TODO
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => { setSelectedCategory(selectedCategory === cat.name ? null : cat.name); setMobileNavOpen(false); }}
                  className={cn(
                    "rounded-full border px-3 py-1 text-[11px] font-medium transition-colors",
                    selectedCategory === cat.name
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground"
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        {/* === Hero / Brand Banner === */}
        <section className="border-b border-border/40 bg-gradient-to-b from-primary/[0.02] to-transparent">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-18">
            <div className="flex flex-col items-center text-center">
              {business.logo_url && (
                <img src={business.logo_url} alt="" className="size-16 rounded-2xl object-cover ring-1 ring-border/50 shadow-sm mb-4" />
              )}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground">
                {business.name}
              </h1>
              <p className="mt-3 max-w-lg text-sm text-muted-foreground font-light leading-relaxed">
                Descubre nuestra colección de productos cuidadosamente seleccionados para ti.
              </p>
            </div>
          </div>
        </section>

        {/* === Product Grid === */}
        <section className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:py-16">
          {filtered.length === 0 ? (
            <div className="py-20 text-center">
              <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-muted text-muted-foreground/60">
                <Package className="size-7" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">No hay productos</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {selectedCategory
                  ? `No hay productos en "${selectedCategory}"`
                  : "Esta tienda aún no tiene productos publicados."}
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-2xl font-bold tracking-tight">
                  {selectedCategory || "Todos los productos"}
                </h2>
                <span className="text-xs tabular-nums text-muted-foreground/70">
                  {filtered.length} producto{filtered.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 lg:gap-6">
                {filtered.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    currencySymbol={$}
                    hasSale={hasSale(product)}
                  />
                ))}
              </div>
            </>
          )}
        </section>

        {/* === Newsletter === */}
        <section className="border-t border-border/40 py-20">
          <div className="max-w-lg mx-auto px-6 text-center">
            <h2 className="text-2xl font-bold tracking-tight mb-2">Mantente al día</h2>
            <p className="text-sm text-muted-foreground font-light mb-6">
              Recibe ofertas exclusivas y novedades.
            </p>
            <form
              className="flex flex-col sm:flex-row gap-3"
              onSubmit={(e) => { e.preventDefault(); setEmail(""); }}
            >
              <Input
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1 bg-transparent border-border text-sm"
              />
              <Button type="submit" className="px-8">Suscribirse</Button>
            </form>
          </div>
        </section>
      </main>

      {/* === Footer === */}
      <footer className="bg-foreground text-background pt-14 pb-8">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8 mb-14">
          {/* Brand */}
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 text-xl font-bold tracking-tight mb-5">
              {business.logo_url && (
                <img src={business.logo_url} alt="" className="size-6 rounded object-cover ring-1 ring-white/10" />
              )}
              {business.name}
            </div>
            <p className="text-xs text-background/60 font-light leading-relaxed mb-6">
              Tu tienda de confianza. Productos de calidad con envío rápido y atención personalizada.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-background/60 hover:text-background transition-colors"><Instagram className="size-4" /></a>
              <a href="#" className="text-background/60 hover:text-background transition-colors"><Facebook className="size-4" /></a>
              <a href="#" className="text-background/60 hover:text-background transition-colors"><Twitter className="size-4" /></a>
            </div>
          </div>

          {/* Shop */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-widest mb-6 text-background/80">Productos</h4>
            <ul className="space-y-3 text-xs font-light text-background/60">
              {categories.slice(0, 4).map((cat) => (
                <li key={cat.id}>
                  <button
                    onClick={() => setSelectedCategory(cat.name)}
                    className="hover:text-background transition-colors"
                  >
                    {cat.name}
                  </button>
                </li>
              ))}
              <li>
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="hover:text-background transition-colors"
                >
                  Todos los productos
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-widest mb-6 text-background/80">Soporte</h4>
            <ul className="space-y-3 text-xs font-light text-background/60">
              <li><a href="#" className="hover:text-background transition-colors">Contacto</a></li>
              <li><a href="#" className="hover:text-background transition-colors">FAQ</a></li>
              <li><a href="#" className="hover:text-background transition-colors">Envíos</a></li>
              <li><a href="#" className="hover:text-background transition-colors">Devoluciones</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-widest mb-6 text-background/80">Legal</h4>
            <ul className="space-y-3 text-xs font-light text-background/60">
              <li><a href="#" className="hover:text-background transition-colors">Privacidad</a></li>
              <li><a href="#" className="hover:text-background transition-colors">Términos</a></li>
              <li><a href="#" className="hover:text-background transition-colors">Cookies</a></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 pt-8 border-t border-background/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[10px] text-background/40 font-light">
            &copy; 2024 {business.name}. Todos los derechos reservados.
          </p>
          <p className="flex items-center gap-1.5 text-[10px] text-background/40 font-light">
            Powered by
            <a
              href="https://commerceai.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-background/60 underline underline-offset-4 transition-colors hover:text-background"
            >
              Commerce AI <ExternalLink className="size-2.5" />
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

function ProductCard({
  product,
  currencySymbol: $,
  hasSale,
}: {
  product: Product;
  currencySymbol: string;
  hasSale: boolean;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="group cursor-pointer">
      <div className="relative aspect-[3/4] bg-muted mb-3 overflow-hidden rounded-lg">
        {product.image_url && !imgError ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="size-full object-cover transition-all duration-500 group-hover:scale-105"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <Package className="size-8 text-muted-foreground/20" />
          </div>
        )}

        {hasSale && (
          <Badge className="absolute top-3 left-3 bg-destructive text-destructive-foreground shadow-sm text-[10px] font-medium px-2 py-0.5">
            Oferta
          </Badge>
        )}

        {product.stock <= 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[1px]">
            <span className="rounded-full border bg-background px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-sm">
              Agotado
            </span>
          </div>
        )}

        <div className="absolute bottom-3 right-3 grid size-8 place-items-center rounded-full bg-white/90 backdrop-blur shadow-sm opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
          <Plus className="size-4 text-foreground" strokeWidth={2} />
        </div>
      </div>

      <h3 className="text-sm font-medium text-foreground truncate">{product.name}</h3>
      <div className="mt-0.5 flex items-center gap-1.5">
        {hasSale ? (
          <>
            <span className="text-sm font-semibold text-destructive">
              {$}{product.sale_price!.toFixed(2)}
            </span>
            <span className="text-xs text-muted-foreground line-through">
              {$}{product.price.toFixed(2)}
            </span>
          </>
        ) : (
          <span className="text-sm font-semibold">{$}{product.price.toFixed(2)}</span>
        )}
      </div>
    </div>
  );
}
