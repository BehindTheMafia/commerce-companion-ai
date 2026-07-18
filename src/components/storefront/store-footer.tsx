import { Link } from "@tanstack/react-router";
import { ExternalLink, Instagram, Facebook, Twitter } from "lucide-react";
import type { Business } from "@/types/storefront";
import { useStoreSettings } from "@/hooks/use-store-settings";

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

  return (
    <footer className="border-t border-border/40 bg-muted/20 pt-16 pb-10 mt-auto">
      <div className="max-w-[1440px] mx-auto px-5 md:px-8 lg:px-12 grid grid-cols-2 md:grid-cols-4 gap-10 mb-14">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2.5 text-lg font-bold tracking-tight mb-4">
            {business.logo_url && (
              <img
                src={business.logo_url}
                alt=""
                className="size-7 rounded-xl object-cover ring-1 ring-border/50"
              />
            )}
            {business.name}
          </div>
          {hasSocialLinks && (
            <div className="flex gap-2.5">
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
                    className="grid size-9 place-items-center rounded-xl border border-border/50 text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all"
                  >
                    <Icon className="size-3.5" />
                  </a>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <h4 className="text-[10px] font-semibold uppercase tracking-widest mb-4 text-foreground">
            Tienda
          </h4>
          <ul className="space-y-2.5 text-xs text-muted-foreground">
            <li>
              <Link
                to="/go/$slug"
                params={{ slug }}
                className="hover:text-foreground transition-colors"
              >
                Catalogo Completo
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-[10px] font-semibold uppercase tracking-widest mb-4 text-foreground">
            Soporte
          </h4>
          <ul className="space-y-2.5 text-xs text-muted-foreground">
            <li>
              <a href="#" className="hover:text-foreground transition-colors">
                Contacto
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-foreground transition-colors">
                FAQ
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-foreground transition-colors">
                Envios
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-[10px] font-semibold uppercase tracking-widest mb-4 text-foreground">
            Legal
          </h4>
          <ul className="space-y-2.5 text-xs text-muted-foreground">
            <li>
              <a href="#" className="hover:text-foreground transition-colors">
                Privacidad
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-foreground transition-colors">
                Terminos
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-5 md:px-8 lg:px-12 pt-8 border-t border-border/40 flex flex-col sm:flex-row justify-between items-center gap-3">
        <p className="text-[10px] text-muted-foreground">
          &copy; {new Date().getFullYear()} {business.name}. Todos los derechos reservados.
        </p>
        <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          Powered by{" "}
          <a
            href="https://hyperbeecommerce.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-foreground hover:text-primary transition-colors"
          >
            Commerce AI <ExternalLink className="size-2.5" />
          </a>
        </p>
      </div>
    </footer>
  );
}
