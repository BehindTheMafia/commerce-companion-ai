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
  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-6 lg:mb-10 flex items-center gap-2 text-[11px] text-muted-foreground"
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-2">
            {i > 0 && <ChevronRight className="size-3 opacity-40" />}
            {isLast || !item.to ? (
              <span
                className={
                  isLast
                    ? "text-foreground font-medium truncate max-w-[180px]"
                    : "text-muted-foreground"
                }
              >
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
