import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useBusiness } from "@/lib/business-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Tag,
  Search,
  ChevronRight,
  ChevronDown,
  GripVertical,
  Pencil,
  Trash2,
  FolderOpen,
  Move,
  Check,
  X,
  FileUp,
  Layers,
  Package,
} from "lucide-react";
import { useState, useMemo, useCallback, useRef } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/categories")({
  component: CategoriesPage,
});

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  description: string | null;
  image_url: string | null;
  sort_order: number;
};

type CategoryNode = CategoryRow & {
  productCount: number;
  children: CategoryNode[];
};

function buildTree(cats: CategoryRow[], counts: Record<string, number>): CategoryNode[] {
  const map = new Map<string, CategoryNode>();
  for (const c of cats) {
    map.set(c.id, { ...c, productCount: counts[c.id] ?? 0, children: [] });
  }
  const roots: CategoryNode[] = [];
  for (const c of cats) {
    const node = map.get(c.id)!;
    if (c.parent_id && map.has(c.parent_id)) {
      map.get(c.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function totalChildren(nodes: CategoryNode[]): number {
  let count = 0;
  for (const n of nodes) {
    count += n.children.length;
    count += totalChildren(n.children);
  }
  return count;
}

function CategoriesPage() {
  const { activeBusiness } = useBusiness();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [movingId, setMovingId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["categories", activeBusiness?.id],
    enabled: !!activeBusiness,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("business_id", activeBusiness!.id)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as CategoryRow[];
    },
  });

  const { data: productCounts = {} as Record<string, number> } = useQuery({
    queryKey: ["products-category-counts", activeBusiness?.id],
    enabled: !!activeBusiness,
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("category_id")
        .eq("business_id", activeBusiness!.id)
        .not("category_id", "is", null);
      const counts: Record<string, number> = {};
      for (const p of data ?? []) {
        if (p.category_id) {
          counts[p.category_id] = (counts[p.category_id] ?? 0) + 1;
        }
      }
      return counts;
    },
  });

  const tree = useMemo(() => buildTree(categories, productCounts), [categories, productCounts]);

  const filtered: CategoryNode[] = useMemo(() => {
    if (!q) return tree;
    const term = q.toLowerCase();
    return tree.filter((n) => {
      if (n.name.toLowerCase().includes(term)) return true;
      return n.children.some((c) => c.name.toLowerCase().includes(term));
    });
  }, [tree, q]);

  const totalRoot = tree.length;
  const totalSub = totalChildren(tree);
  const totalOrg = Object.keys(productCounts).length;

  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  async function handleDelete(node: CategoryNode) {
    if (!window.confirm(`¿Eliminar "${node.name}"? Esta acción no se puede deshacer.`)) return;
    const { error } = await supabase.from("categories").delete().eq("id", node.id);
    if (error) {
      toast.error("Error al eliminar la categoría");
      return;
    }
    toast.success("Categoría eliminada");
    qc.invalidateQueries({ queryKey: ["categories"] });
    qc.invalidateQueries({ queryKey: ["products-category-counts"] });
  }

  async function handleRename(id: string) {
    if (!editName.trim() || editName === categories.find((c) => c.id === id)?.name) {
      setEditingId(null);
      return;
    }
    const { error } = await supabase
      .from("categories")
      .update({ name: editName.trim() })
      .eq("id", id);
    if (error) {
      toast.error("Error al actualizar");
      return;
    }
    toast.success("Nombre actualizado");
    setEditingId(null);
    qc.invalidateQueries({ queryKey: ["categories"] });
  }

  async function handleMove(id: string, newParentId: string) {
    setMovingId(null);
    const parent = newParentId === "root" ? null : newParentId;
    if (parent === id) return;
    const { error } = await supabase.from("categories").update({ parent_id: parent }).eq("id", id);
    if (error) {
      toast.error("Error al mover la categoría");
      return;
    }
    toast.success("Categoría movida");
    qc.invalidateQueries({ queryKey: ["categories"] });
  }

  async function handleDrop(draggedId: string, targetId: string) {
    setDragId(null);
    setDragOverId(null);
    if (draggedId === targetId) return;
    const draggedIdx = categories.findIndex((c) => c.id === draggedId);
    const targetIdx = categories.findIndex((c) => c.id === targetId);
    if (draggedIdx === -1 || targetIdx === -1) return;
    const reordered = [...categories];
    const [moved] = reordered.splice(draggedIdx, 1);
    reordered.splice(targetIdx, 0, moved);
    const updates = reordered.map((c, i) => ({
      id: c.id,
      sort_order: i,
    })) as Database["public"]["Tables"]["categories"]["Insert"][];
    const { error } = await supabase.from("categories").upsert(updates, { onConflict: "id" });
    if (error) {
      toast.error("Error al reordenar");
      return;
    }
    qc.invalidateQueries({ queryKey: ["categories"] });
  }

  const moveOptions = useMemo(() => {
    return categories.filter((c) => c.parent_id === null && c.id !== movingId);
  }, [categories, movingId]);

  if (isLoading) {
    return <SkeletonCategories />;
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Categorías</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Organiza tu catálogo en categorías y subcategorías.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar categorías..."
              className="w-56 pl-9"
            />
          </div>
          <Button
            className="gap-2 shrink-0"
            onClick={() => navigate({ to: "/app/categories/new" })}
          >
            <Plus className="size-4" /> Nueva categoría
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-4 p-5">
          <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary shrink-0">
            <Tag className="size-5" />
          </div>
          <div>
            <p className="text-2xl font-semibold tabular-nums">{totalRoot}</p>
            <p className="text-xs text-muted-foreground">Categorías</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-5">
          <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary shrink-0">
            <Layers className="size-5" />
          </div>
          <div>
            <p className="text-2xl font-semibold tabular-nums">{totalSub}</p>
            <p className="text-xs text-muted-foreground">Subcategorías</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-5">
          <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary shrink-0">
            <Package className="size-5" />
          </div>
          <div>
            <p className="text-2xl font-semibold tabular-nums">{totalOrg}</p>
            <p className="text-xs text-muted-foreground">Productos organizados</p>
          </div>
        </Card>
      </div>

      {filtered.length === 0 ? (
        q ? (
          <div className="mt-16 flex flex-col items-center gap-3 text-center">
            <div className="grid size-14 place-items-center rounded-full bg-muted">
              <Search className="size-6 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold">Sin resultados</h3>
            <p className="text-sm text-muted-foreground">
              Ninguna categoría coincide con tu búsqueda.
            </p>
          </div>
        ) : (
          <div className="mt-16 flex flex-col items-center gap-6 text-center">
            <div className="relative">
              <div className="grid size-24 place-items-center rounded-2xl bg-primary/[0.05] text-primary/30 ring-1 ring-primary/10">
                <FolderOpen className="size-10" />
              </div>
              <div className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-full bg-primary text-white shadow-lg">
                <Tag className="size-4" />
              </div>
            </div>
            <div className="space-y-1.5 max-w-sm">
              <h3 className="text-lg font-semibold">Organiza tu catálogo</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Crea categorías para agrupar tus productos y ayuda a tus clientes a encontrar lo que
                buscan más rápido.
              </p>
            </div>
            <div className="flex flex-col gap-2 text-left text-sm text-muted-foreground bg-muted/30 rounded-xl p-4 max-w-sm w-full">
              <div className="flex items-start gap-3">
                <div className="grid size-6 place-items-center rounded-full bg-primary/10 text-primary shrink-0 mt-0.5">
                  <FileUp className="size-3.5" />
                </div>
                <span>
                  Crea categorías principales como <strong>Electrónicos</strong> o{" "}
                  <strong>Ropa</strong>
                </span>
              </div>
              <div className="flex items-start gap-3">
                <div className="grid size-6 place-items-center rounded-full bg-primary/10 text-primary shrink-0 mt-0.5">
                  <Layers className="size-3.5" />
                </div>
                <span>Agrega subcategorías para una organización más precisa</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="grid size-6 place-items-center rounded-full bg-primary/10 text-primary shrink-0 mt-0.5">
                  <Package className="size-3.5" />
                </div>
                <span>Asigna productos a cada categoría desde el editor</span>
              </div>
            </div>
            <Button onClick={() => navigate({ to: "/app/categories/new" })} className="gap-2">
              <Plus className="size-4" /> Crear primera categoría
            </Button>
          </div>
        )
      ) : (
        <div className="mt-6">
          <Card className="border-border/40 overflow-hidden">
            <div className="divide-y divide-border/40">
              {filtered.map((node) => (
                <TreeNode
                  key={node.id}
                  node={node}
                  depth={0}
                  expanded={expanded}
                  onToggle={toggleExpand}
                  onDelete={handleDelete}
                  onRename={handleRename}
                  onMove={handleMove}
                  onDrop={handleDrop}
                  editingId={editingId}
                  editName={editName}
                  setEditingId={setEditingId}
                  setEditName={setEditName}
                  movingId={movingId}
                  setMovingId={setMovingId}
                  moveOptions={moveOptions}
                  dragId={dragId}
                  dragOverId={dragOverId}
                  setDragId={setDragId}
                  setDragOverId={setDragOverId}
                  parentOptions={moveOptions}
                />
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function TreeNode({
  node,
  depth,
  expanded,
  onToggle,
  onDelete,
  onRename,
  onMove,
  onDrop,
  editingId,
  editName,
  setEditingId,
  setEditName,
  movingId,
  setMovingId,
  moveOptions,
  dragId,
  dragOverId,
  setDragId,
  setDragOverId,
  parentOptions,
}: {
  node: CategoryNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onDelete: (node: CategoryNode) => void;
  onRename: (id: string) => void;
  onMove: (id: string, newParentId: string) => void;
  onDrop: (draggedId: string, targetId: string) => void;
  editingId: string | null;
  editName: string;
  setEditingId: (id: string | null) => void;
  setEditName: (name: string) => void;
  movingId: string | null;
  setMovingId: (id: string | null) => void;
  moveOptions: CategoryRow[];
  dragId: string | null;
  dragOverId: string | null;
  setDragId: (id: string | null) => void;
  setDragOverId: (id: string | null) => void;
  parentOptions: CategoryRow[];
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expanded.has(node.id);
  const isEditing = editingId === node.id;
  const isMoving = movingId === node.id;
  const isDragOver = dragOverId === node.id;

  return (
    <div>
      <div
        className={`group flex items-center gap-2 px-4 py-3 transition-colors hover:bg-muted/30 ${
          isDragOver ? "bg-primary/5 ring-1 ring-primary/20" : ""
        }`}
        style={{ paddingLeft: `${16 + depth * 24}px` }}
        draggable
        onDragStart={(e) => {
          setDragId(node.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOverId(node.id);
        }}
        onDragLeave={() => setDragOverId(null)}
        onDrop={(e) => {
          e.preventDefault();
          if (dragId) onDrop(dragId, node.id);
        }}
      >
        <button
          className="cursor-grab touch-none text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity hover:text-muted-foreground shrink-0"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <GripVertical className="size-3.5" />
        </button>

        {hasChildren ? (
          <button
            onClick={() => onToggle(node.id)}
            className="grid size-5 place-items-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          >
            {isExpanded ? (
              <ChevronDown className="size-3.5" />
            ) : (
              <ChevronRight className="size-3.5" />
            )}
          </button>
        ) : (
          <div className="size-5 shrink-0" />
        )}

        <Tag className="size-4 text-muted-foreground shrink-0" />

        {isEditing ? (
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="h-7 text-sm flex-1 min-w-0"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") onRename(node.id);
                if (e.key === "Escape") setEditingId(null);
              }}
            />
            <button
              onClick={() => onRename(node.id)}
              className="grid size-6 place-items-center rounded text-success hover:bg-success/10 transition-colors"
            >
              <Check className="size-3.5" />
            </button>
            <button
              onClick={() => setEditingId(null)}
              className="grid size-6 place-items-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ) : (
          <span className="flex-1 min-w-0 truncate text-sm font-medium">{node.name}</span>
        )}

        <Badge variant="secondary" className="text-[10px] font-mono shrink-0">
          {node.productCount} {node.productCount === 1 ? "prod" : "prods"}
        </Badge>

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={() => {
              setEditingId(node.id);
              setEditName(node.name);
            }}
            className="grid size-7 place-items-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Pencil className="size-3.5" />
          </button>

          <div className="relative">
            <button
              onClick={() => setMovingId(isMoving ? null : node.id)}
              className="grid size-7 place-items-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Move className="size-3.5" />
            </button>
            {isMoving && (
              <div className="absolute right-0 top-full z-20 mt-1 min-w-44 rounded-lg border bg-popover p-1.5 shadow-lg">
                <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  Mover a
                </p>
                <button
                  onClick={() => onMove(node.id, "root")}
                  className="w-full rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted transition-colors"
                >
                  Sin categoría padre
                </button>
                {parentOptions
                  .filter((c) => c.id !== node.id)
                  .map((c) => (
                    <button
                      key={c.id}
                      onClick={() => onMove(node.id, c.id)}
                      className="w-full rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted transition-colors"
                    >
                      {c.name}
                    </button>
                  ))}
              </div>
            )}
          </div>

          <button
            onClick={() => onDelete(node)}
            aria-label={`Eliminar categoría ${node.name}`}
            className="grid size-7 place-items-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div className="border-l border-border/40 ml-[52px]">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              onDelete={onDelete}
              onRename={onRename}
              onMove={onMove}
              onDrop={onDrop}
              editingId={editingId}
              editName={editName}
              setEditingId={setEditingId}
              setEditName={setEditName}
              movingId={movingId}
              setMovingId={setMovingId}
              moveOptions={moveOptions}
              dragId={dragId}
              dragOverId={dragOverId}
              setDragId={setDragId}
              setDragOverId={setDragOverId}
              parentOptions={parentOptions}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SkeletonCategories() {
  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 rounded bg-muted" />
        <div className="h-4 w-72 rounded bg-muted" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-muted" />
          ))}
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    </div>
  );
}
