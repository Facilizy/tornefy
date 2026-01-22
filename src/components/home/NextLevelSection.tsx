import { Zap, ShieldCheck, CalendarDays, Users, Trophy, Sparkles } from "lucide-react";

const FEATURES = [
  {
    icon: CalendarDays,
    title: "Calendário claro",
    desc: "Datas organizadas por dia, com filtro instantâneo e visão dos próximos 7 dias.",
  },
  {
    icon: Users,
    title: "Slots sem bagunça",
    desc: "Inscrições e gestão de equipes do jeito certo — sem perder tempo no chat.",
  },
  {
    icon: ShieldCheck,
    title: "Confiança e regras",
    desc: "Configurações do treino, informações importantes e histórico em um só lugar.",
  },
  {
    icon: Trophy,
    title: "Ranking e performance",
    desc: "Acompanhe evolução por temporada e destaque os melhores da semana.",
  },
  {
    icon: Zap,
    title: "Rápido no mobile",
    desc: "Interface leve e objetiva para você garantir o slot e focar no jogo.",
  },
  {
    icon: Sparkles,
    title: "Experiência premium",
    desc: "Detalhes, consistência e fluxo pensado para times competitivos.",
  },
];

export function NextLevelSection() {
  return (
    <section aria-labelledby="next-level-title" className="container mx-auto px-4 py-12">
      <div className="mb-6">
        <h2 id="next-level-title" className="text-3xl md:text-4xl font-black tracking-tight">
          Gaming no Próximo Nível
        </h2>
        <p className="mt-2 text-muted-foreground max-w-2xl">
          A Tornefy é uma plataforma brasileira para scrims e treinos: calendário, organização e
          evolução do time — tudo no mesmo lugar.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <div
              key={f.title}
              className="rounded-2xl border border-border bg-card/40 p-5 backdrop-blur"
            >
              <div className="h-10 w-10 rounded-xl border border-border bg-background/60 flex items-center justify-center">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mt-4 font-extrabold tracking-tight text-foreground">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
