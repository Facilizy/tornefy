import { useMemo, useState, useEffect } from "react";
import MainLayout from "@/components/MainLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { setSeo } from "@/lib/seo";
import { z } from "zod";

type FaqItem = {
  id: string;
  category: "players" | "equipes" | "scrims" | "organizador";
  question: string;
  answer: string;
  keywords: string[];
};

const searchSchema = z
  .string()
  .transform((v) => v.trim())
  .pipe(z.string().max(60));

const FAQ_ITEMS: FaqItem[] = [
  {
    id: "criar-time",
    category: "equipes",
    question: "Como criar uma equipe?",
    answer:
      "Vá em Minha Equipe → Criar equipe. Escolha nome e TAG. Depois adicione seus jogadores (line/main/reserva) e salve. Sua TAG é usada para inscrições e convites.",
    keywords: ["equipe", "time", "criar", "tag", "roster"],
  },
  {
    id: "participar-scrim",
    category: "scrims",
    question: "Como participar de uma scrim/treino?",
    answer:
      "Abra a página de Scrims, escolha um treino e clique em Inscrever. Se o treino for privado, sua TAG precisa estar na lista de convidados. Em alguns modos, sua equipe precisa ter o mínimo de jogadores cadastrado.",
    keywords: ["scrim", "treino", "inscrição", "inscrever", "privado", "convidados"],
  },
  {
    id: "checkin",
    category: "scrims",
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
    category: "scrims",
    question: "Como funciona a pontuação?",
    answer:
      "A pontuação depende das configurações do treino (pontos por kill e por colocação). No detalhe do treino, abra a seção de Regras/Pontuação para ver exatamente o método daquele evento.",
    keywords: ["pontuação", "kills", "colocação", "regras"],
  },
  {
    id: "ranking",
    category: "players",
    question: "Como funciona o ranking de jogadores?",
    answer:
      "O ranking soma pontos por temporada e por jogo. Você pode alternar jogo/temporada no ranking e no seu perfil. Patentes (Bronze → Triunfante) dependem de pontos e regra de corte.",
    keywords: ["ranking", "temporada", "patente", "triunfante", "pontos"],
  },
];

export default function FAQ() {
  const [query, setQuery] = useState("");

  useEffect(() => {
    setSeo({
      title: "FAQ | Tornefy",
      description:
        "Perguntas frequentes: como criar equipe, participar de scrims e organizar treinos no Tornefy.",
      canonical: `${window.location.origin}/faq`,
    });
  }, []);

  const safeQuery = useMemo(() => {
    const parsed = searchSchema.safeParse(query);
    return parsed.success ? parsed.data : "";
  }, [query]);

  const filtered = useMemo(() => {
    if (!safeQuery) return FAQ_ITEMS;
    const q = safeQuery.toLowerCase();
    return FAQ_ITEMS.filter((it) => {
      const hay = `${it.question} ${it.answer} ${it.keywords.join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [safeQuery]);

  return (
    <MainLayout showUpcomingScrimWidget={false}>
      <main className="container mx-auto px-4 py-8">
        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">
            FAQ
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
            Pesquise por palavras-chave (ex: equipe, scrim, check-in, organizador) e veja o
            passo a passo.
          </p>
        </header>

        <Card className="p-5 bg-card/60 border-border backdrop-blur">
          <div className="grid gap-2">
            <Label htmlFor="faq-search" className="text-xs text-muted-foreground uppercase tracking-wide">
              Buscar
            </Label>
            <Input
              id="faq-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Digite uma palavra-chave..."
              inputMode="search"
              autoComplete="off"
            />
            {query && !safeQuery ? (
              <p className="text-xs text-muted-foreground">Máximo de 60 caracteres.</p>
            ) : null}
          </div>

          <div className="mt-5">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum resultado. Tente outra palavra.
              </p>
            ) : (
              <Accordion type="multiple" className="w-full">
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
          </div>
        </Card>
      </main>
    </MainLayout>
  );
}
