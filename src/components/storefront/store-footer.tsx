import { Link } from "@tanstack/react-router";
import { ExternalLink, Instagram, Facebook, Twitter, ShoppingBag } from "lucide-react";
import type { Business } from "@/types/storefront";
import { useStoreSettings } from "@/hooks/use-store-settings";
import { getWhatsAppLink } from "@/lib/whatsapp";
import { APP_NAME, getAppBaseUrl } from "@/lib/config";

type StoreFooterProps = {
  business: Business;
  slug: string;
};

const SOCIAL_ICONS: Record<string, { icon: React.ComponentType<{ className?: string }> }> = {
  instagram: { icon: Instagram },
  facebook: { icon: Facebook },
  twitter: { icon: Twitter },
};

export function StoreFooter({ business, slug }: StoreFooterProps) {
  const settings = useStoreSettings(business);
  const socialLinks = settings.social_links;
  const hasSocialLinks = Object.values(socialLinks).some((url) => url);
  const waPhone = business.whatsapp_phone;
  const hasSupport = Boolean(waPhone);

  return (
    <footer className="mt-auto border-t border-border/40 bg-muted/20 pt-14 pb-16 md:pb-10">
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-10 px-5 md:grid-cols-4 md:px-8 lg:px-12">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2.5">
            {business.logo_url ? (
              <img
                src={business.logo_url}
                alt=""
                className="size-7 rounded-xl object-cover ring-1 ring-border/50"
              />
            ) : (
              <div className="grid size-7 place-items-center rounded-xl bg-primary/10 text-primary">
                <ShoppingBag className="size-4" />
              </div>
            )}
            <span className="font-display text-lg font-bold tracking-tight text-foreground">
              {business.name}
            </span>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
            Haz tu pedido directamente por WhatsApp y coordina la entrega de forma rápida y
            sencilla.
          </p>
          {hasSocialLinks && (
            <div className="mt-6 flex gap-2.5">
              {Object.entries(socialLinks).map(([key, url]) => {
                if (!url) return null;
                const { icon: Icon } = SOCIAL_ICONS[key] ?? {};
                if (!Icon) return null;
                return (
                  <a
                    key={key}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="grid size-9 place-items-center rounded-xl border border-border/50 text-muted-foreground transition-all hover:border-foreground/30 hover:text-foreground"
                    aria-label={`${key} de ${business.name}`}
                  >
                    <Icon className="size-3.5" />
                  </a>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <h4 className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-foreground">
            Tienda
          </h4>
          <ul className="space-y-2.5 text-sm text-muted-foreground">
            <li>
              <Link
                to="/go/$slug"
                params={{ slug }}
                className="transition-colors hover:text-foreground"
              >
                Catalogo completo
              </Link>
            </li>
          </ul>
        </div>

        {hasSupport && (
          <div>
            <h4 className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-foreground">
              Soporte
            </h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li>
                <a
                  href={getWhatsAppLink(
                    waPhone!,
                    "Hola, quisiera más información sobre su tienda.",
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-foreground"
                >
                  Contacto
                </a>
              </li>
              <li>
                <a
                  href={getWhatsAppLink(waPhone!, "Hola, quiero hacer un pedido.")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-foreground"
                >
                  Hacer un pedido
                </a>
              </li>
            </ul>
          </div>
        )}
      </div>

      <div className="mx-auto mt-12 flex max-w-[1440px] flex-col items-center justify-between gap-3 border-t border-border/40 px-5 pt-8 sm:flex-row md:px-8 lg:px-12">
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} {business.name}. Todos los derechos reservados.
        </p>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          Powered by{" "}
          <a
            href={getAppBaseUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-foreground transition-colors hover:text-primary"
          >
            {APP_NAME} <ExternalLink className="size-2.5" />
          </a>
        </p>
      </div>
    </footer>
  );
}
