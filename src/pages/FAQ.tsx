import { useMemo, useState, useEffect } from "react";
import MainLayout from "@/components/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { setSeo } from "@/lib/seo";
import { z } from "zod";
import { Play, FileText } from "lucide-react";
import { YouTubeTutorialPlayer } from "@/components/faq/YouTubeTutorialPlayer";

type FaqItem = {
  id: string;
  category: "jogador" | "organizador";
  question: string;
  answer: string;
  keywords: string[];
};

type VideoItem = {
  id: string;
  category: "jogador" | "organizador";
  title: string;
  description: string;
  youtubeId: string;
  durationSeconds: number;
};

const searchSchema = z
  .string()
  .transform((v) => v.trim())
  .pipe(z.string().max(60));

const FAQ_ITEMS: FaqItem[] = [
  {
    id: "criar-time",
    category: "jogador",
    question: "Como criar uma equipe?",
    answer:
      "Vá em Minha Equipe → Criar equipe. Escolha nome e TAG. Depois adicione seus jogadores (line/main/reserva) e salve. Sua TAG é usada para inscrições e convites.",
    keywords: ["equipe", "time", "criar", "tag", "roster"],
  },
  {
    id: "participar-scrim",
    category: "jogador",
    question: "Como participar de uma scrim/treino?",
    answer:
      "Abra a página de Scrims, escolha um treino e clique em Inscrever. Se o treino for privado, sua TAG precisa estar na lista de convidados. Em alguns modos, sua equipe precisa ter o mínimo de jogadores cadastrado.",
    keywords: ["scrim", "treino", "inscrição", "inscrever", "privado", "convidados"],
  },
  {
    id: "checkin",
    category: "jogador",
    question: "O que é check-in e como funciona?",
    answer:
      "Alguns treinos exigem check-in perto do horário. Quando disponível, um admin da equipe pode confirmar presença dentro da página do treino. Sem check-in, a equipe pode perder a vaga.",
    keywords: ["check-in", "checkin", "vaga", "admin"],
  },
  {
    id: "criar-scrim",
    category: "organizador",
    question: "Como criar uma scrim/treino como organizador?",
    answer:
      "Acesse Painel do Organizador → Criar Treino. Defina jogo, data/hora, modo, limite de vagas, links (Discord/WhatsApp) e regras. Você pode editar o treino depois pelo painel.",
    keywords: ["organizador", "criar", "treino", "scrim", "painel"],
  },
  {
    id: "pontuacao",
    category: "jogador",
    question: "Como funciona a pontuação?",
    answer:
      "A pontuação depende das configurações do treino (pontos por kill e por colocação). No detalhe do treino, abra a seção de Regras/Pontuação para ver exatamente o método daquele evento.",
    keywords: ["pontuação", "kills", "colocação", "regras"],
  },
  {
    id: "ranking",
    category: "jogador",
    question: "Como funciona o ranking de jogadores?",
    answer:
      "O ranking soma pontos por temporada e por jogo. Você pode alternar jogo/temporada no ranking e no seu perfil. Patentes (Bronze → Triunfante) dependem de pontos e regra de corte.",
    keywords: ["ranking", "temporada", "patente", "triunfante", "pontos"],
  },
];

const VIDEO_ITEMS: VideoItem[] = [
  {
    id: "intro-player",
    category: "jogador",
    title: "Introdução para Jogadores",
    description: "Aprenda a navegar pela plataforma como jogador e criar sua equipe.",
    youtubeId: "MFMhoNtTSdk",
    durationSeconds: 300,
  },
  {
    id: "intro-organizer",
    category: "organizador",
    title: "Introdução para Organizadores",
    description: "Saiba como criar e gerenciar treinos na plataforma.",
    youtubeId: "MFMhoNtTSdk",
    durationSeconds: 300,
  },
];

export default function FAQ() {
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"text" | "videos">("text");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "jogador" | "organizador">("all");
  const [watchedSeconds, setWatchedSeconds] = useState<Record<string, number>>({});
  const [videoDurations, setVideoDurations] = useState<Record<string, number>>({});

  useEffect(() => {
    setSeo({
      title: "FAQ e Tutoriais | Tornefy",
      description:
        "Perguntas frequentes e vídeos tutoriais: aprenda a criar equipe, participar de scrims e organizar treinos no Tornefy.",
      canonical: `${window.location.origin}/faq`,
    });
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("tornefy_video_progress");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Record<string, number>;
        setWatchedSeconds(parsed);
      } catch {
        // ignore parse error
      }
    }
  }, []);

  const safeQuery = useMemo(() => {
    const parsed = searchSchema.safeParse(query);
    return parsed.success ? parsed.data : "";
  }, [query]);

  const filtered = useMemo(() => {
    let base = FAQ_ITEMS;
    if (categoryFilter !== "all") {
      base = base.filter((it) => it.category === categoryFilter);
    }
    if (!safeQuery) return base;
    const q = safeQuery.toLowerCase();
    return base.filter((it) => {
      const hay = `${it.question} ${it.answer} ${it.keywords.join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [safeQuery, categoryFilter]);

  const filteredVideos = useMemo(() => {
    let base = VIDEO_ITEMS;
    if (categoryFilter !== "all") {
      base = base.filter((v) => v.category === categoryFilter);
    }
    if (!safeQuery) return base;
    const q = safeQuery.toLowerCase();
    return base.filter((v) => {
      const hay = `${v.title} ${v.description}`.toLowerCase();
      return hay.includes(q);
    });
  }, [safeQuery, categoryFilter]);

  const handleVideoProgress = (videoId: string, seconds: number, duration?: number) => {
    setWatchedSeconds((prev) => {
      const updated = { ...prev, [videoId]: seconds };
      localStorage.setItem("tornefy_video_progress", JSON.stringify(updated));
      return updated;
    });
    if (typeof duration === "number" && Number.isFinite(duration) && duration > 0) {
      setVideoDurations((prev) => ({ ...prev, [videoId]: duration }));
    }
  };

  return (
    <MainLayout showUpcomingScrimWidget={false}>
      <main className="container mx-auto px-4 py-8">
        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">
            FAQ & Tutoriais
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
            Aprenda com textos ou vídeos. Filtre por jogador ou organizador.
          </p>
        </header>

        <Card className="p-5 bg-card/60 border-border backdrop-blur mb-6">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
            <TabsList className="bg-card/50 mb-4">
              <TabsTrigger value="text" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Texto
              </TabsTrigger>
              <TabsTrigger value="videos" className="flex items-center gap-2">
                <Play className="w-4 h-4" />
                Vídeos
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="faq-search" className="text-xs text-muted-foreground uppercase tracking-wide">
              Buscar
            </Label>
            <Input
              id="faq-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
                placeholder={viewMode === "text" ? "Digite uma palavra-chave..." : "Buscar vídeos..."}
              inputMode="search"
              autoComplete="off"
            />
            </div>

            <div className="flex gap-2">
              <Button
                variant={categoryFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setCategoryFilter("all")}
              >
                Todos
              </Button>
              <Button
                variant={categoryFilter === "jogador" ? "default" : "outline"}
                size="sm"
                onClick={() => setCategoryFilter("jogador")}
              >
                Jogador
              </Button>
              <Button
                variant={categoryFilter === "organizador" ? "default" : "outline"}
                size="sm"
                onClick={() => setCategoryFilter("organizador")}
              >
                Organizador
              </Button>
            </div>
          </div>
        </Card>

        {viewMode === "text" ? (
          <Card className="p-5 bg-card/60 border-border backdrop-blur">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum resultado. Tente outra palavra.
              </p>
            ) : (
              <Accordion type="single" collapsible className="w-full">
                {filtered.map((it) => (
                  <AccordionItem key={it.id} value={it.id}>
                    <AccordionTrigger className="text-left">
                      {it.question}
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {it.answer}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredVideos.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8 col-span-full">
                Nenhum vídeo encontrado. Tente ajustar os filtros.
              </p>
            ) : (
              filteredVideos.map((video) => {
                const watched = watchedSeconds[video.id] || 0;
                const duration = videoDurations[video.id] || video.durationSeconds;
                const progress = duration > 0 ? (watched / duration) * 100 : 0;
                return (
                  <Card key={video.id} className="overflow-hidden bg-card/60 border-border backdrop-blur">
                    <div className="aspect-video bg-muted relative">
                      <YouTubeTutorialPlayer
                        videoId={video.youtubeId}
                        startSeconds={watched > 3 ? watched - 2 : 0}
                        className="absolute inset-0"
                        onProgress={({ currentTime, duration }) =>
                          handleVideoProgress(video.id, Math.floor(currentTime), duration)
                        }
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-lg mb-2">{video.title}</h3>
                      <p className="text-sm text-muted-foreground mb-3">{video.description}</p>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Progresso</span>
                          <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5">
                          <div
                            className="bg-primary h-1.5 rounded-full transition-all"
                            style={{ width: `${Math.min(100, progress)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        )}
      </main>
    </MainLayout>
  );
}
