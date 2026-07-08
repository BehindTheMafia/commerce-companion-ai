import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/lib/business-context";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/customers")({
  component: CustomersPage,
});

function CustomersPage() {
  const { activeBusiness } = useBusiness();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [full_name, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: customers = [] } = useQuery({
    queryKey: ["customers", activeBusiness?.id],
    enabled: !!activeBusiness,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers").select("*")
        .eq("business_id", activeBusiness!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!activeBusiness) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("customers").insert({
        business_id: activeBusiness.id,
        full_name, email: email || null, phone: phone || null, notes: notes || null,
      });
      if (error) throw error;
      toast.success("Cliente agregado");
      setFullName(""); setEmail(""); setPhone(""); setNotes("");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      <PageHeader
        title="Clientes"
        description="Base de datos CRM. Cada cliente tendrá historial, conversaciones y perfil 360°."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="gap-2"><Plus className="size-4" /> Nuevo</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nuevo cliente</DialogTitle></DialogHeader>
              <form onSubmit={create} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cu-name">Nombre completo</Label>
                  <Input id="cu-name" value={full_name} onChange={(e) => setFullName(e.target.value)} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="cu-email">Email</Label>
                    <Input id="cu-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cu-phone">Teléfono</Label>
                    <Input id="cu-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cu-notes">Notas</Label>
                  <Textarea id="cu-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
                </div>
                <DialogFooter><Button type="submit" disabled={busy}>Guardar</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <Card className="mt-6 overflow-hidden">
        {customers.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-16 text-center">
            <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary"><Users className="size-6" /></div>
            <p className="text-sm text-muted-foreground">Aún no tienes clientes registrados.</p>
            <Button onClick={() => setOpen(true)} className="gap-2"><Plus className="size-4" /> Agregar cliente</Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Notas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.full_name}</TableCell>
                  <TableCell className="text-muted-foreground">{c.email || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{c.phone || "—"}</TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">{c.notes || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
