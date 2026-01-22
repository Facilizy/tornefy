import { Star } from "lucide-react";

type Feedback = {
  name: string;
  role: string;
  text: string;
};

const FEEDBACKS: Feedback[] = [
  {
    name: "Bruno ‘Bz’ Almeida",
    role: "Capitão • Free Fire",
    text: "A gente parou de perder tempo caçando slot em chat. Calendário + filtro por dia virou rotina no time.",
  },
  {
    name: "Letícia Santos",
    role: "Organizadora",
    text: "O fluxo é limpo e rápido. Criei treinos, convidei equipes e o pessoal entende tudo sem explicação longa.",
  },
  {
    name: "Caio ‘Kyo’ Fernandes",
    role: "Player • Blood Strike",
    text: "Visual premium, mas sem poluição. Dá pra entrar, ver o que tem hoje e garantir o slot em poucos cliques.",
  },
];

export function FeedbackSection() {
  return (
    <section aria-labelledby="feedback-title" className="container mx-auto px-4 py-12">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 id="feedback-title" className="text-2xl md:text-3xl font-black tracking-tight">
            Feedback da comunidade
          </h2>
          <p className="text-muted-foreground mt-1">Nomes brasileiros, elogios reais e foco em performance.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {FEEDBACKS.map((f) => (
          <figure key={f.name} className="rounded-2xl border border-border bg-card/40 p-5">
            <div className="flex items-center gap-2 text-primary">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-current" />
              ))}
            </div>
            <blockquote className="mt-3 text-sm text-foreground/90">“{f.text}”</blockquote>
            <figcaption className="mt-4">
              <div className="font-extrabold tracking-tight text-foreground">{f.name}</div>
              <div className="text-xs text-muted-foreground">{f.role}</div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
