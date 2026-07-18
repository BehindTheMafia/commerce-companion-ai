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
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Montserrat:wght@200;300;400;500;600&display=swap",
      },
    ],
  }),
});


