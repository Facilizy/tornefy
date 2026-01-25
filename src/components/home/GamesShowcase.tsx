import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Play } from "lucide-react";
import { GAMES } from "@/lib/games";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

type GamesShowcaseProps = {
  onSelectGame?: (gameId: string) => void;
};

function getCoverByGameId(gameId: string): string {
  switch (gameId) {
    case "free_fire":
      return "/game-covers/free-fire.webp";
    case "blood_strike":
      return "/game-covers/blood-strike.webp";
    case "farlight_84":
      return "/game-covers/farlight-84.webp";
    case "prime_rush":
      return "/game-covers/prime-rush.webp";
    case "battlefield_6":
      return "/game-covers/battlefield-6.webp";
    default:
      return "";
  }
}

export function GamesShowcase({ onSelectGame }: GamesShowcaseProps) {
  const navigate = useNavigate();
  const gamesWithCovers = useMemo(
    () =>
      GAMES.map((g) => ({
        ...g,
        cover: getCoverByGameId(g.id),
      })),
    []
  );

  return (
    <section aria-labelledby="games-title" className="container mx-auto px-4 py-12">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h2 id="games-title" className="text-2xl md:text-3xl font-black tracking-tight">
            Games
          </h2>
          <p className="text-muted-foreground mt-1">
            Escolha seu game e encontre os próximos treinos.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/scrims")}
          className="hidden sm:inline-flex items-center rounded-full border border-border bg-card/40 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-card/60"
        >
          Ver todos
        </button>
      </div>

      {/* Mobile: carousel (estilo referência) */}
      <div className="sm:hidden">
        <Carousel opts={{ align: "start", dragFree: true }} className="relative">
          <CarouselContent className="-ml-4">
            {gamesWithCovers.map((g) => (
              <CarouselItem key={g.id} className="pl-4 basis-[70%]">
                <button
                  type="button"
                  onClick={() => onSelectGame?.(g.id)}
                  className="group relative w-full text-left"
                  aria-label={`Ver treinos de ${g.label}`}
                >
                  <div className="relative overflow-hidden rounded-2xl border border-border bg-card/40 transition-transform duration-300 motion-safe:group-hover:-translate-y-1 motion-safe:group-hover:[transform:translateY(-4px)_rotate(-0.6deg)]">
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/40 to-transparent" />
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-primary/35 via-transparent to-transparent" />
                      <div className="absolute -inset-12 opacity-0 group-hover:opacity-100 transition-opacity blur-2xl bg-primary/20" />
                    </div>

                    <div className="aspect-[3/4]">
                      {g.cover ? (
                        <img
                          src={g.cover}
                          alt={`Arte do jogo ${g.label}`}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-full w-full bg-muted" />
                      )}
                    </div>

                    <div className="absolute inset-x-0 bottom-0 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-[11px] text-muted-foreground">Tornefy • Scrims</div>
                          <div className="mt-0.5 flex items-center gap-2">
                            <div className="text-sm font-extrabold tracking-tight text-foreground">
                              {g.label}
                            </div>
                          </div>
                        </div>

                        <div className="h-9 w-9 rounded-full border border-border bg-background/60 backdrop-blur flex items-center justify-center transition-colors group-hover:bg-primary/20">
                          <Play className="h-4 w-4 text-primary" />
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="-left-2" />
          <CarouselNext className="-right-2" />
        </Carousel>

        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => navigate("/scrims")}
            className="inline-flex items-center rounded-full border border-border bg-card/40 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-card/60"
          >
            Ver todos
          </button>
        </div>
      </div>

      {/* Desktop: grid */}
      <div className="hidden sm:grid grid-cols-3 lg:grid-cols-5 gap-4">
        {gamesWithCovers.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => onSelectGame?.(g.id)}
            className="group relative text-left"
            aria-label={`Ver treinos de ${g.label}`}
          >
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card/40 transition-transform duration-300 motion-safe:group-hover:-translate-y-1 motion-safe:group-hover:[transform:translateY(-4px)_rotate(-0.6deg)]">
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/40 to-transparent" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-primary/35 via-transparent to-transparent" />
                <div className="absolute -inset-12 opacity-0 group-hover:opacity-100 transition-opacity blur-2xl bg-primary/20" />
              </div>

              <div className="aspect-[3/4]">
                {g.cover ? (
                  <img
                    src={g.cover}
                    alt={`Arte do jogo ${g.label}`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-full w-full bg-muted" />
                )}
              </div>

              <div className="absolute inset-x-0 bottom-0 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] text-muted-foreground">Tornefy • Scrims</div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <div className="text-sm font-extrabold tracking-tight text-foreground">
                        {g.label}
                      </div>
                    </div>
                  </div>

                  <div className="h-9 w-9 rounded-full border border-border bg-background/60 backdrop-blur flex items-center justify-center transition-colors group-hover:bg-primary/20">
                    <Play className="h-4 w-4 text-primary" />
                  </div>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
