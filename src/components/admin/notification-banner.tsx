import { motion } from "motion/react";
import { BellRing, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  blocked: boolean;
  busy: boolean;
  onEnable: () => void;
  onDismiss: () => void;
};

/**
 * Elegant banner inviting the admin to re-enable push notifications after they
 * were denied. Shows once per session and never nags again.
 */
export function NotificationBanner({ blocked, busy, onEnable, onDismiss }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.98 }}
      transition={{ duration: 0.35, ease: [0.22, 0.61, 0.36, 1] }}
      className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-4"
    >
      <div className="pointer-events-auto flex w-full max-w-xl items-center gap-3 rounded-2xl border border-border/60 bg-background/85 p-3 pl-4 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.25)] backdrop-blur-xl">
        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <BellRing className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">
            {blocked ? "Notificaciones bloqueadas" : "Recibe notificaciones de nuevos pedidos"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {blocked
              ? "Actívalas desde la configuración del navegador para no perderte ningún pedido."
              : "Te avisaremos al instante, incluso con el panel cerrado."}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {blocked ? (
            <Button
              size="sm"
              className="h-8 gap-1.5 px-3 text-xs"
              onClick={() =>
                window.open(
                  "https://support.google.com/chrome/answer/3220216",
                  "_blank",
                  "noopener,noreferrer",
                )
              }
            >
              <ExternalLink className="size-3.5" />
              Cómo activarlas
            </Button>
          ) : (
            <Button size="sm" className="h-8 px-3 text-xs" disabled={busy} onClick={onEnable}>
              Activar
            </Button>
          )}
          <button
            onClick={onDismiss}
            aria-label="Cerrar"
            className="grid size-8 place-items-center rounded-lg text-muted-foreground/60 transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
