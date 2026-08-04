import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { motion } from "motion/react";
import { ShoppingCart, X, ChevronRight } from "lucide-react";
import { getCurrencySymbol } from "@/lib/currency";
import type { RealtimeOrder } from "@/lib/push/types";

function timeAgo(iso?: string | null): string {
  if (!iso) return "ahora";
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 10) return "hace unos segundos";
  if (seconds < 60) return "hace unos segundos";
  const mins = Math.floor(seconds / 60);
  if (mins === 1) return "hace 1 minuto";
  if (mins < 60) return `hace ${mins} minutos`;
  const hours = Math.floor(mins / 60);
  if (hours === 1) return "hace 1 hora";
  if (hours < 24) return `hace ${hours} horas`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "hace 1 día";
  return `hace ${days} días`;
}

function formatMoney(total: number | null, currency: string | null): string {
  const symbol = getCurrencySymbol(currency ?? "USD");
  const n = Number(total ?? 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbol}${n}`;
}

type Props = {
  toastId: string | number;
  order?: RealtimeOrder;
  orders?: RealtimeOrder[];
};

/**
 * Premium glassmorphism toast shown when a new order arrives while the admin
 * panel is open. Rendered inside sonner (top-right).
 */
export function NewOrderToastContent({ toastId, order, orders }: Props) {
  const navigate = useNavigate();
  const list = orders ?? (order ? [order] : []);

  const openOrder = (id: string) => {
    toast.dismiss(toastId);
    navigate({ to: "/app/orders", search: { order: id } });
  };

  const first = list[0];
  const count = list.length;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 0.61, 0.36, 1] }}
      className="relative flex items-start gap-3 overflow-hidden rounded-2xl border border-border/60 bg-background/80 p-4 pr-10 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.28)] backdrop-blur-xl"
    >
      <div className="relative shrink-0">
        <motion.span
          className="absolute -inset-1.5 rounded-full bg-primary/20"
          initial={{ scale: 0.6, opacity: 0.8 }}
          animate={{ scale: 1.6, opacity: 0 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
        />
        <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
          <motion.div
            initial={{ scale: 0.6, rotate: -12 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 18 }}
          >
            <ShoppingCart className="size-5" />
          </motion.div>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground">
            {count > 1 ? `${count} nuevos pedidos` : "Nuevo pedido"}
          </p>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        </div>

        {count === 1 && first ? (
          <>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {first.customer_name || "Cliente"}
              </span>{" "}
              realizó un pedido.
            </p>
            <div className="mt-1 flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">{first.order_number}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums text-foreground">
                {formatMoney(first.total, first.currency)}
              </span>
            </div>
          </>
        ) : (
          <>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {count} pedidos llegaron en los últimos minutos.
            </p>
            <div className="mt-1 flex items-center gap-2">
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums text-foreground">
                {list
                  .reduce((acc, o) => acc + Number(o.total ?? 0), 0)
                  .toLocaleString("en-US", {
                    style: "currency",
                    currency: "USD",
                    maximumFractionDigits: 0,
                  })}
              </span>
            </div>
          </>
        )}

        <p className="mt-1 text-[11px] text-muted-foreground/70">{timeAgo(first?.created_at)}</p>

        {count === 1 && first && (
          <button
            onClick={() => openOrder(first.id)}
            className="mt-2.5 inline-flex h-8 items-center gap-1 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-md active:scale-[0.98]"
          >
            Ver pedido <ChevronRight className="size-3.5" />
          </button>
        )}
      </div>

      <button
        onClick={() => toast.dismiss(toastId)}
        aria-label="Cerrar"
        className="absolute right-2.5 top-2.5 grid size-6 place-items-center rounded-md text-muted-foreground/60 transition-colors hover:bg-accent hover:text-foreground"
      >
        <X className="size-3.5" />
      </button>
    </motion.div>
  );
}
