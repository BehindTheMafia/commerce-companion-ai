import { ChevronRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

type BreadcrumbItem = {
  label: string;
  to?: string;
  params?: Record<string, string>;
};

type ProductBreadcrumbsProps = {
  items: BreadcrumbItem[];
};

export function ProductBreadcrumbs({ items }: ProductBreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-8 lg:mb-12 flex items-center gap-2 text-[11px] text-muted-foreground"
    >
      <Link
        to="/go/$slug"
        params={{ slug: items[0]?.params?.slug ?? "" }}
        className="hover:text-foreground transition-colors underline underline-offset-2"
      >
        {items[0]?.label ?? "Inicio"}
      </Link>
      {items.slice(1).map((item, i) => {
        const isLast = i === items.length - 2;
        return (
          <span key={i} className="flex items-center gap-2">
            <ChevronRight className="size-3 opacity-40" />
            {isLast || !item.to ? (
              <span className="text-foreground font-medium truncate max-w-[180px]">
                {item.label}
              </span>
            ) : (
              <Link
                to={item.to as never}
                params={item.params as never}
                className="hover:text-foreground transition-colors underline underline-offset-2"
              >
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
