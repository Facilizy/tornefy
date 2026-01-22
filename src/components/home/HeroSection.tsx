import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

type HeroSectionProps = {
  onPrimaryCta?: () => void;
  backgroundImageUrl?: string;
};

export function HeroSection({ onPrimaryCta, backgroundImageUrl }: HeroSectionProps) {
  const navigate = useNavigate();
  const [bgOffset, setBgOffset] = useState(0);
  const reduceMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches,
    []
  );

  useEffect(() => {
    if (reduceMotion) return;
    let raf = 0;

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY || 0;
        // Parallax suave: mexe pouco para não causar enjoo
        setBgOffset(Math.min(32, y * 0.12));
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, [reduceMotion]);

  return (
    <header className="relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        {backgroundImageUrl ? (
          <div
            className="absolute inset-0 bg-center bg-cover opacity-35"
            style={{
              backgroundImage: `url(${backgroundImageUrl})`,
              // Zera totalmente a saturação da imagem (P&B) e mantém um leve contraste
              filter: "saturate(0) contrast(1.05)",
              transform: reduceMotion
                ? undefined
                : `translate3d(0, ${bgOffset}px, 0) scale(1.06)`,
              willChange: reduceMotion ? undefined : "transform",
            }}
          />
        ) : null}
        {/* Purple tonemap + vignette */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/30 via-background/70 to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary))_0%,transparent_55%)] opacity-15" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        <div className="absolute -top-28 left-1/2 h-80 w-[54rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-28 right-[-8rem] h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="container mx-auto px-4 pt-14 pb-10 md:pt-20 md:pb-14 relative">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-card/40 px-4 py-2 text-sm text-primary backdrop-blur animate-enter">
            <Sparkles className="h-4 w-4" />
            <span className="font-semibold tracking-wide">SCRIMS • TREINOS • RANKING</span>
          </div>

          <h1 className="mt-6 text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter leading-[0.95] animate-fade-in">
            <span className="block text-foreground">EVOLUA.</span>
            <span className="block text-foreground">COMPETE.</span>
            <span className="block text-foreground">DOMINE.</span>
          </h1>

          <p className="mt-5 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto animate-fade-in">
            A plataforma brasileira para organizar treinos, preencher slots e jogar sério — sem bagunça.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 animate-enter">
            <Button
              size="lg"
              className="w-full sm:w-auto"
              onClick={() => (onPrimaryCta ? onPrimaryCta() : navigate("/scrims"))}
            >
              Quero meu slot agora
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => navigate("/equipes")}
            >
              Ver equipes
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
