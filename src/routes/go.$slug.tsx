import { createFileRoute, Outlet } from "@tanstack/react-router";
import { CartProvider } from "@/lib/cart-context";

export const Route = createFileRoute("/go/$slug")({
  component: () => (
    <CartProvider>
      <Outlet />
    </CartProvider>
  ),
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} | Commerce AI` },
      { name: "description", content: `Compra en ${params.slug} — productos con envío rápido y pago seguro.` },
      { property: "og:title", content: `${params.slug} | Commerce AI` },
      { property: "og:description", content: `Descubre los productos de ${params.slug}.` },
    ],
    links: [],
  }),
});


