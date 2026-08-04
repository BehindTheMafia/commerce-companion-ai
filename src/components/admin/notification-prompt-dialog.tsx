import { motion } from "motion/react";
import { BellRing, ShoppingCart } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/animate-ui/components/radix/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  busy: boolean;
  onEnable: () => void;
  onDismiss: () => void;
};

/**
 * One-time opt-in dialog shown after the first login: "¿Deseas recibir
 * notificaciones de nuevos pedidos?". The answer is persisted per business.
 */
export function NotificationPromptDialog({ open, busy, onEnable, onDismiss }: Props) {
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && !busy) onDismiss();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: [0.8, 1.05, 1] }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <BellRing className="size-6" />
            </motion.div>
          </div>
          <DialogTitle className="text-lg">
            ¿Deseas recibir notificaciones de nuevos pedidos?
          </DialogTitle>
          <DialogDescription>
            Te avisaremos al instante cuando un cliente realice un pedido, incluso si el panel está
            cerrado. Puedes cambiar esto cuando quieras desde tu perfil.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-start gap-2.5 rounded-xl border border-border/50 bg-muted/30 p-3 text-sm text-muted-foreground">
          <ShoppingCart className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>
            Solo se envían notificaciones de <strong>nuevos pedidos</strong> de tus negocios. Sin
            spam, sin uso comercial de tus datos.
          </span>
        </div>
        <DialogFooter className="gap-2 sm:justify-end">
          <Button variant="outline" disabled={busy} onClick={onDismiss}>
            Ahora no
          </Button>
          <Button disabled={busy} onClick={onEnable} className="gap-2">
            <BellRing className="size-4" />
            Sí, activar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
