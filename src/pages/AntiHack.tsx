import MainLayout from "@/components/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AppWindow, CheckCircle2, Download, Link2, MonitorUp, ShieldCheck, Zap } from "lucide-react";

const DOWNLOAD_URL =
  "https://drive.usercontent.google.com/download?id=1naKhIt46CWnrPjnQi_XsWzcXCuncQwa1&export=download&authuser=0";

export default function AntiHack() {
  const featureCardClass =
    "group relative overflow-hidden rounded-xl border border-border bg-card/60 p-5 backdrop-blur transition-transform hover:scale-[1.01]";
  const featureIconWrapClass =
    "relative flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card/70";

  return (
    <MainLayout>
      <div className="relative overflow-hidden">
        {/* Background */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-[-240px] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-[-260px] right-[-220px] h-[520px] w-[520px] rounded-full bg-muted/60 blur-3xl" />
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/70 to-background" />
        </div>

        <div className="container mx-auto px-4 py-10 sm:py-14">
          {/* HERO */}
          <header className="mx-auto max-w-5xl text-center">
            <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-2 text-sm text-muted-foreground backdrop-blur">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Tornefy Secure — Anti‑Hack / Anti‑Cheating oficial
            </div>

            <h1 className="text-balance text-4xl font-black tracking-tight sm:text-6xl">
              SUA SCRIM SEGURA DE VERDADE!
            </h1>

            <p className="mx-auto mt-4 max-w-3xl text-pretty text-base text-muted-foreground sm:text-lg">
              Utilize a Tornefy Secure — nosso Anti‑Hack / Anti‑Cheating oficial, integrado com a Tornefy.
            </p>

            <div className="mx-auto mt-7 flex max-w-2xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
              <a href={DOWNLOAD_URL} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto">
                  <AppWindow className="mr-2 h-4 w-4" />
                  Baixar para Windows
                </Button>
              </a>
              <div className="text-xs text-muted-foreground">
                App integrado com a plataforma Tornefy (dados interligados).
              </div>
            </div>
          </header>

          {/* BENEFÍCIOS */}
          <section className="mx-auto mt-10 max-w-6xl sm:mt-12" aria-labelledby="beneficios">
            <h2 id="beneficios" className="sr-only">
              Benefícios
            </h2>

            <div className="grid gap-4 md:grid-cols-3">
              <Card className={featureCardClass}>
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-primary/10 blur-2xl transition-opacity duration-300 group-hover:opacity-100 opacity-0" />
                <div className="relative flex flex-col gap-3">
                  <div className={featureIconWrapClass}>
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold">Verificações</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Temos a parte de verificações que é capaz de pegar o hack no PC e registrar a validação no treino.
                    </p>
                  </div>
                </div>
              </Card>

              <Card className={featureCardClass}>
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-primary/10 blur-2xl transition-opacity duration-300 group-hover:opacity-100 opacity-0" />
                <div className="relative flex flex-col gap-3">
                  <div className={featureIconWrapClass}>
                    <MonitorUp className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold">Otimização de PC</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Funcionalidade de otimização já confirmada, com relatos de potencializar até 75% do seu PC.
                    </p>
                  </div>
                </div>
              </Card>

              <Card className={featureCardClass}>
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-primary/10 blur-2xl transition-opacity duration-300 group-hover:opacity-100 opacity-0" />
                <div className="relative flex flex-col gap-3">
                  <div className={featureIconWrapClass}>
                    <Link2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold">Integração Tornefy</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Dados interligados: tudo integrado com a plataforma Tornefy para um cenário mais seguro.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </section>

          {/* COMO FUNCIONA */}
          <section className="mx-auto mt-10 max-w-6xl sm:mt-12" aria-labelledby="como-funciona">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="p-6 sm:p-8">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Zap className="h-4 w-4 text-primary" />
                  Como funciona
                </div>
                <h2 id="como-funciona" className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                  Um fluxo simples para deixar seu evento mais seguro.
                </h2>
                <ul className="mt-5 space-y-3 text-sm text-muted-foreground sm:text-base">
                  <li className="flex gap-3">
                    <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-card text-xs font-semibold">
                      1
                    </span>
                    <span>
                      Organize sua scrim na Tornefy e compartilhe o uso da ferramenta com os participantes.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-card text-xs font-semibold">
                      2
                    </span>
                    <span>
                      Participantes realizam a verificação — a validação fica ligada ao treino/scrim.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-card text-xs font-semibold">
                      3
                    </span>
                    <span>
                      Você acompanha quem verificou e mantém o cenário mais justo e limpo.
                    </span>
                  </li>
                </ul>
              </Card>

              <Card className="p-6 sm:p-8">
                <h3 className="text-lg font-semibold">Manifesto</h3>
                <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                  Queremos sempre trazer o melhor cenário possível e mais seguro. Conte conosco para fazer isso acontecer.
                </p>
                <p className="mt-4 text-sm text-muted-foreground sm:text-base">
                  <span className="font-medium text-foreground">Vamos lutar por um cenário justo e limpo!</span>
                </p>
                <div className="mt-6">
                  <a href={DOWNLOAD_URL} target="_blank" rel="noopener noreferrer">
                    <Button className="w-full sm:w-auto">
                      <Download className="mr-2 h-4 w-4" />
                      Baixar para Windows
                    </Button>
                  </a>
                </div>
              </Card>
            </div>
          </section>

          {/* FAQ */}
          <section className="mx-auto mt-10 max-w-4xl sm:mt-12" aria-labelledby="faq">
            <h2 id="faq" className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
              Dúvidas frequentes
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-muted-foreground sm:text-base">
              Transparência e clareza para organizadores e jogadores.
            </p>

            <Card className="mt-6 p-2 sm:p-4">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>Isso é integrado com a Tornefy?</AccordionTrigger>
                  <AccordionContent>
                    Sim — a proposta é ser uma ferramenta oficial integrada com a plataforma Tornefy, com dados interligados ao treino/scrim.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-2">
                  <AccordionTrigger>O que eu ganho usando a Tornefy Secure?</AccordionTrigger>
                  <AccordionContent>
                    Mais segurança no seu evento, verificações registradas e um cenário mais justo para a comunidade.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-3">
                  <AccordionTrigger>Tem otimização de PC mesmo?</AccordionTrigger>
                  <AccordionContent>
                    Sim — além das verificações, existe a funcionalidade de otimização com relatos confirmados de melhorias significativas.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </Card>
          </section>
        </div>
      </div>
    </MainLayout>
  );
}
