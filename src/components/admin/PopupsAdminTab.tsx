import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

type PopupRow = {
  id: string;
  kind: string;
  active: boolean;
  title: string;
  description: string | null;
  cta_label: string;
  svg_markup: string | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
};

type Paginated<T> = { items: T[]; total: number };

function isoOrNull(v: string) {
  const s = v.trim();
  return s ? s : null;
}

function PopupEditor({
  open,
  onOpenChange,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: PopupRow | null;
  onSaved: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [kind, setKind] = useState(initial?.kind ?? "educational");
  const [active, setActive] = useState(initial?.active ?? true);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [ctaLabel, setCtaLabel] = useState(initial?.cta_label ?? "Entendi");
  const [startsAt, setStartsAt] = useState(initial?.starts_at ?? "");
  const [endsAt, setEndsAt] = useState(initial?.ends_at ?? "");
  const [svg, setSvg] = useState(initial?.svg_markup ?? "");

  const isEdit = !!initial?.id;

  const save = async () => {
    if (!title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        kind,
        active,
        title: title.trim(),
        description: description.trim() ? description.trim() : null,
        cta_label: ctaLabel.trim() ? ctaLabel.trim() : "Entendi",
        starts_at: isoOrNull(startsAt),
        ends_at: isoOrNull(endsAt),
        svg_markup: svg.trim() ? svg.trim() : null,
      };
      if (isEdit) {
        const res = await adminApi<{ ok: true }>(`/popups/${initial!.id}`, { method: "PATCH", body: payload });
        if (res.ok === false) throw new Error(res.error);
      } else {
        const res = await adminApi<{ id: string }>("/popups", { method: "POST", body: payload });
        if (res.ok === false) throw new Error(res.error);
      }
      toast.success("Salvo!");
      onOpenChange(false);
      await onSaved();
    } catch (e: any) {
      toast.error(e?.message ? String(e.message) : "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Popup" : "Criar Popup"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Tipo</Label>
              <Input value={kind} onChange={(e) => setKind(e.target.value)} placeholder="welcome | educational" />
            </div>
            <div className="flex items-end">
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
                Ativo
              </label>
            </div>
          </div>

          <div>
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Bem-vindo!" />
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>

          <div>
            <Label>Texto do botão</Label>
            <Input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} placeholder="Entendi" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Começa em (ISO)</Label>
              <Input value={startsAt ?? ""} onChange={(e) => setStartsAt(e.target.value)} placeholder="2026-01-01T00:00:00Z" />
            </div>
            <div>
              <Label>Termina em (ISO)</Label>
              <Input value={endsAt ?? ""} onChange={(e) => setEndsAt(e.target.value)} placeholder="2026-12-31T23:59:59Z" />
            </div>
          </div>

          <div>
            <Label>SVG (markup)</Label>
            <Textarea value={svg} onChange={(e) => setSvg(e.target.value)} rows={8} placeholder="Cole aqui o <svg>...</svg>" />
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function PopupsAdminTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 20;
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState<PopupRow | null>(null);

  const popupsQuery = useQuery({
    queryKey: ["admin", "popups", search, page],
    queryFn: async (): Promise<Paginated<PopupRow>> => {
      const res = await adminApi<Paginated<PopupRow>>("/popups", {
        query: {
          search,
          limit: String(pageSize),
          offset: String(page * pageSize),
        },
      });
      if (res.ok === false) throw new Error(res.error);
      return res.data;
    },
  });

  const rows = popupsQuery.data?.items ?? [];
  const total = popupsQuery.data?.total ?? 0;

  const pageInfo = useMemo(() => {
    if (!total) return "0-0";
    const from = page * pageSize + 1;
    const to = Math.min((page + 1) * pageSize, total);
    return `${from}-${to}`;
  }, [page, pageSize, total]);

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ["admin", "popups"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este popup?")) return;
    const res = await adminApi<{ ok: true }>(`/popups/${id}`, { method: "DELETE" });
    if (res.ok === false) {
      toast.error(res.error);
      return;
    }
    toast.success("Excluído");
    await refresh();
  };

  const sendToAll = async (id: string) => {
    if (!confirm("Enviar este popup para todos? (isso fará o popup aparecer novamente para quem já dispensou)")) return;
    const res = await adminApi<{ ok: true; reset_dismissals: number }>(`/popups/${id}/send`, { method: "POST" });
    if (res.ok === false) {
      toast.error(res.error);
      return;
    }
    toast.success(`Enviado! Reset: ${res.data.reset_dismissals}`);
  };

  return (
    <section className="mt-4">
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="w-full sm:max-w-sm">
          <Label>Buscar</Label>
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Título"
          />
        </div>

        <Button onClick={() => setCreateOpen(true)}>Criar Popup</Button>

        <div className="ml-auto flex items-center gap-2">
          <Button size="xs" variant="outline" onClick={() => setPage((p) => Math.max(p - 1, 0))} disabled={page === 0}>
            Anterior
          </Button>
          <div className="text-xs text-muted-foreground">
            {pageInfo} de {total}
          </div>
          <Button size="xs" variant="outline" onClick={() => setPage((p) => p + 1)} disabled={(page + 1) * pageSize >= total}>
            Próxima
          </Button>
        </div>
      </div>

      <div className="mt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.title}</TableCell>
                <TableCell>{r.kind}</TableCell>
                <TableCell>{r.active ? "Sim" : "Não"}</TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex gap-2">
                    <Button size="xs" variant="secondary" onClick={() => sendToAll(r.id)}>
                      Enviar para todos
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => {
                        setSelected(r);
                        setEditOpen(true);
                      }}
                    >
                      Editar
                    </Button>
                    <Button size="xs" variant="destructive" onClick={() => remove(r.id)}>
                      Excluir
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <PopupEditor open={createOpen} onOpenChange={setCreateOpen} onSaved={refresh} />
      <PopupEditor
        open={editOpen}
        onOpenChange={setEditOpen}
        initial={selected}
        onSaved={refresh}
      />
    </section>
  );
}
