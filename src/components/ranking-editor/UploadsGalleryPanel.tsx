import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Trash2, Upload } from "lucide-react";

type Item = {
  name: string;
  path: string;
  signedUrl: string;
  updatedAt?: string;
};

type Props = {
  userId: string;
  onUploadFile: (file: File) => void;
  onUseImage: (storagePath: string) => void;
};

export function UploadsGalleryPanel({ userId, onUploadFile, onUseImage }: Props) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [q, setQ] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.storage.from("ranking-art-assets").list(userId, {
          limit: 100,
          sortBy: { column: "updated_at", order: "desc" },
        });
        if (error) throw error;

        const files = (data || []).filter((x: any) => x?.name && !x?.id?.endsWith?.("/") && x?.metadata?.mimetype?.startsWith?.("image/") !== false);
        const paths = files.map((f: any) => `${userId}/${f.name}`);

        const signed = await Promise.all(
          paths.map(async (path, idx) => {
            const { data: s, error: sErr } = await supabase.storage.from("ranking-art-assets").createSignedUrl(path, 60 * 60);
            if (sErr) return null;
            return {
              name: files[idx].name,
              path,
              signedUrl: s.signedUrl,
              updatedAt: files[idx].updated_at,
            } as Item;
          }),
        );

        if (cancelled) return;
        setItems(signed.filter(Boolean) as Item[]);
      } catch (e: any) {
        if (!cancelled) toast.error(e?.message ? String(e.message) : "Falha ao carregar uploads");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [userId, refreshKey]);

  const filtered = useMemo(() => {
    if (!q.trim()) return items;
    const qq = q.toLowerCase();
    return items.filter((i) => i.name.toLowerCase().includes(qq));
  }, [items, q]);

  const remove = async (path: string) => {
    try {
      const { error } = await supabase.storage.from("ranking-art-assets").remove([path]);
      if (error) throw error;
      toast.success("Arquivo removido");
      setRefreshKey((k) => k + 1);
    } catch (e: any) {
      toast.error(e?.message ? String(e.message) : "Falha ao remover arquivo");
    }
  };

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold">Uploads</div>
        <label className="inline-flex">
          <input
            className="sr-only"
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUploadFile(f);
              e.currentTarget.value = "";
              setTimeout(() => setRefreshKey((k) => k + 1), 600);
            }}
          />
          <Button variant="outline" size="sm" className="gap-2" asChild>
            <span>
              <Upload className="h-4 w-4" />
              Enviar
            </span>
          </Button>
        </label>
      </div>

      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar nos uploads" />

      {loading ? (
        <Card className="p-3">
          <div className="text-sm text-muted-foreground">Carregando…</div>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-3">
          <div className="text-sm text-muted-foreground">Nenhuma imagem enviada ainda.</div>
        </Card>
      ) : (
        <ScrollArea className="h-[calc(100vh-16rem)]">
          <div className="grid grid-cols-2 gap-2">
            {filtered.map((it) => (
              <Card key={it.path} className="overflow-hidden">
                <button
                  type="button"
                  className="block w-full text-left"
                  onClick={() => onUseImage(it.path)}
                  title="Clique para inserir no canvas"
                >
                  <img src={it.signedUrl} alt={it.name} className="h-28 w-full object-cover" loading="lazy" />
                </button>
                <div className="p-2 flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs truncate">{it.name}</div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => void remove(it.path)} title="Remover">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
