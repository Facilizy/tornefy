import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { setSeo, getCanonicalOrigin } from "@/lib/seo";
import { buildUrl } from "@/components/broadcast-links/url";
import { copyToClipboard } from "@/components/broadcast-links/clipboard";
import { PreviewEmbed } from "@/components/broadcast-links/PreviewEmbed";
import { ArrowLeft, Copy, ExternalLink } from "lucide-react";

type OverlayDef = {
  key: string;
  title: string;
  path: string;
};

const OVERLAYS: OverlayDef[] = [
  { key: "tabela", title: "Tabela Geral", path: "/overlays/tabela-geral" },
  { key: "queda", title: "Tabela (Queda)", path: "/overlays/queda" },
  { key: "rodada", title: "Tabela (Rodada)", path: "/overlays/rodada" },
  { key: "mvp", title: "MVP", path: "/overlays/mvp" },
  { key: "mvp_ranking", title: "MVP Ranking", path: "/overlays/mvp-ranking" },
];

export default function LiveOperator() {
  const navigate = useNavigate();
  const { trainingId } = useParams();

  const [training, setTraining] = useState<{ id: string; name: string | null; primary_color: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    setSeo({
      title: "Modo Operador da Live | Tornefy",
      description: "Controle rápido de overlays (copiar/abrir) com atalhos e preview leve.",
      canonical: `${getCanonicalOrigin()}/operador/${trainingId || ""}`,
    });
  }, [trainingId]);

  useEffect(() => {
    if (!trainingId) return;
    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("trainings")
          .select("id, name, primary_color")
          .eq("id", trainingId)
          .maybeSingle();
        if (error) throw error;
        if (!data) throw new Error("Treino não encontrado");
        if (!cancelled) setTraining(data as any);
      } catch (e: any) {
        toast.error(e?.message ? String(e.message) : "Erro ao carregar treino");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [trainingId]);

  const base = useMemo(() => getCanonicalOrigin(), []);

  const urlFor = (ov: OverlayDef) => {
    const firstColor = training?.primary_color || "";

    // Preview leve: 1 coluna + poucas linhas (sem parâmetro "sample", usamos os já existentes)
    const common: Record<string, string> = {
      treino_id: String(trainingId || ""),
    };

    if (ov.key === "tabela" || ov.key === "queda" || ov.key === "rodada") {
      return buildUrl(base, ov.path, {
        ...common,
        cols: "1",
        limit: "8",
        gap: "28",
        density: "compact",
        ...(firstColor ? { first_color: firstColor } : {}),
      });
    }

    if (ov.key === "mvp") {
      return buildUrl(base, ov.path, {
        ...common,
        ...(firstColor ? { font_color: "#ffffff" } : {}),
      });
    }

    // mvp-ranking
    return buildUrl(base, ov.path, {
      ...common,
      top: "10",
      cols: "1",
      ...(firstColor ? { first_color: firstColor } : {}),
    });
  };

  const copyActive = async () => {
    const ov = OVERLAYS[activeIdx];
    if (!ov) return;
    await copyToClipboard(urlFor(ov));
  };

  const openActive = () => {
    const ov = OVERLAYS[activeIdx];
    if (!ov) return;
    window.open(urlFor(ov), "_blank", "noopener,noreferrer");
  };

  // Atalhos: 1..5 seleciona; Enter copia; O abre; Ctrl/Cmd+1..5 abre; Shift+1..5 copia.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target && (e.target as HTMLElement).tagName === "INPUT") return;

      const n = Number(e.key);
      const isNumber = Number.isFinite(n) && n >= 1 && n <= OVERLAYS.length;

      if (isNumber && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const idx = n - 1;
        const ov = OVERLAYS[idx];
        if (!ov) return;
        window.open(urlFor(ov), "_blank", "noopener,noreferrer");
        return;
      }

      if (isNumber && e.shiftKey) {
        e.preventDefault();
        const idx = n - 1;
        const ov = OVERLAYS[idx];
        if (!ov) return;
        void copyToClipboard(urlFor(ov));
        return;
      }

      if (isNumber) {
        e.preventDefault();
        setActiveIdx(n - 1);
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        void copyActive();
      }

      if (e.key === "o" || e.key === "O") {
        e.preventDefault();
        openActive();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIdx, trainingId, training?.primary_color]);

  const active = OVERLAYS[activeIdx];
  const activeUrl = active ? urlFor(active) : "";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
        <div className="h-14 px-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold truncate">Modo Operador</div>
            <div className="text-xs text-muted-foreground truncate">
              {loading ? "Carregando treino…" : training?.name || trainingId}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={copyActive} disabled={!trainingId || !active} className="gap-2">
              <Copy className="h-4 w-4" />
              <span className="hidden sm:inline">Copiar</span>
            </Button>
            <Button onClick={openActive} disabled={!trainingId || !active} className="gap-2">
              <ExternalLink className="h-4 w-4" />
              <span className="hidden sm:inline">Abrir</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-3 sm:p-6 grid gap-4 md:grid-cols-[320px_1fr]">
        <section className="space-y-2" aria-label="Overlays">
          {OVERLAYS.map((ov, idx) => {
            const isActive = idx === activeIdx;
            return (
              <button
                key={ov.key}
                type="button"
                onClick={() => setActiveIdx(idx)}
                className={
                  "w-full text-left rounded-xl border p-3 transition-colors " +
                  (isActive ? "bg-muted" : "hover:bg-muted/50")
                }
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{ov.title}</div>
                    <div className="text-xs text-muted-foreground">Atalho: {idx + 1}</div>
                  </div>
                </div>
              </button>
            );
          })}

          <Card className="p-3">
            <div className="text-xs text-muted-foreground space-y-1">
              <div>1..5: selecionar</div>
              <div>Enter: copiar</div>
              <div>O: abrir</div>
              <div>Ctrl/Cmd+1..5: abrir direto</div>
              <div>Shift+1..5: copiar direto</div>
            </div>
          </Card>
        </section>

        <section className="space-y-3" aria-label="Preview">
          <Card className="p-3">
            <div className="text-sm font-semibold">{active?.title || "—"}</div>
            <div className="mt-1 text-xs text-muted-foreground break-all">{activeUrl}</div>
          </Card>

          {trainingId && active ? (
            <PreviewEmbed src={activeUrl} baseWidth={1920} baseHeight={300} maxPreviewHeight={220} transparent />
          ) : (
            <Card className="p-6">
              <div className="text-sm text-muted-foreground">Informe um treino válido na URL: /operador/:trainingId</div>
            </Card>
          )}
        </section>
      </main>
    </div>
  );
}
