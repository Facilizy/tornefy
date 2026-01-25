import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/MainLayout";
import TrainingCard from "@/components/TrainingCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Gamepad2, Trophy, Users, SlidersHorizontal, User } from "lucide-react";
import { addDays, endOfDay, startOfDay } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useFollowedOrganizers } from "@/hooks/useFollowedOrganizers";
import { TrainingCardSkeleton } from "@/components/skeletons/TrainingCardSkeleton";
import { withOrganizerMeta } from "@/lib/training-organizer-meta";
import { OrganizerBadge } from "@/components/OrganizerBadge";
import { setSeo } from "@/lib/seo";
import { DefaultAvatarMark } from "@/components/DefaultAvatarMark";

const Scrims = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const followed = useFollowedOrganizers(userId);
  const [showFollowed, setShowFollowed] = useState(true);

  const [trainings, setTrainings] = useState<any[]>([]);
  const [liveTrainings, setLiveTrainings] = useState<any[]>([]);
  const [filteredTrainings, setFilteredTrainings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [modeFilter, setModeFilter] = useState<string>("all");
  const [gameFilter, setGameFilter] = useState<string>("all");
  const [platformFilter, setPlatformFilter] = useState<string>("all");

  useEffect(() => {
    fetchTrainings();
  }, []);

  useEffect(() => {
    setSeo({
      title: "Scrims — Tornefy",
      description:
        "Encontre scrims e treinos abertos, siga organizadores verificados e participe em minutos.",
      canonical: window.location.origin + "/scrims",
    });
  }, []);

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUserId(session?.user?.id ?? null);
    };
    init();
  }, []);

  useEffect(() => {
    filterTrainings();
  }, [trainings, dateFilter, modeFilter, gameFilter, platformFilter]);

  const fetchTrainings = async () => {
    try {
      setLoading(true);
      const { data: trainingsData, error } = await supabase
        .from("trainings")
        .select(`*, training_registrations(count)`)
        .gte("datetime", new Date().toISOString())
        .order("datetime", { ascending: true });

      if (error) throw error;

      const trainingsWithCount = (trainingsData || []).map((training) => ({
        ...training,
        registrations: training.training_registrations?.[0]?.count || 0,
      }));

      const enriched = await withOrganizerMeta(trainingsWithCount);

      setTrainings(enriched || []);
      setLiveTrainings(enriched?.filter((t) => t.is_live) || []);
    } catch (error) {
      console.error("Erro ao carregar scrims:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterTrainings = () => {
    let filtered = [...trainings];

    // Date filter
    if (dateFilter !== "all") {
      const today = startOfDay(new Date());

      if (dateFilter === "today") {
        const todayEnd = endOfDay(new Date());
        filtered = filtered.filter((t) => {
          const date = new Date(t.datetime);
          return date >= today && date <= todayEnd;
        });
      } else if (dateFilter === "tomorrow") {
        const tomorrow = addDays(today, 1);
        const tomorrowEnd = endOfDay(tomorrow);
        filtered = filtered.filter((t) => {
          const date = new Date(t.datetime);
          return date >= tomorrow && date <= tomorrowEnd;
        });
      } else if (dateFilter === "week") {
        const weekEnd = addDays(today, 7);
        filtered = filtered.filter((t) => {
          const date = new Date(t.datetime);
          return date >= today && date <= weekEnd;
        });
      }
    }

    // Mode filter
    if (modeFilter !== "all") {
      filtered = filtered.filter((t) => t.mode === modeFilter);
    }

    // Game filter
    if (gameFilter !== "all") {
      filtered = filtered.filter((t) => t.game === gameFilter);
    }

    // Platform filter
    if (platformFilter !== "all") {
      filtered = filtered.filter((t) => t.platform === platformFilter);
    }

    setFilteredTrainings(filtered);
  };

  const clearFilters = () => {
    setDateFilter("all");
    setModeFilter("all");
    setGameFilter("all");
    setPlatformFilter("all");
  };

  const hasActiveFilters =
    dateFilter !== "all" ||
    modeFilter !== "all" ||
    gameFilter !== "all" ||
    platformFilter !== "all";

  const totals = useMemo(() => {
    return {
      total: trainings.length,
      live: liveTrainings.length,
    };
  }, [trainings.length, liveTrainings.length]);

  return (
    <MainLayout>
      <header className="relative py-12 mb-8 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/16 via-transparent to-transparent" />
        <div className="container mx-auto px-4 relative z-10">
            <div className="flex flex-col items-center text-center gap-3">
             <div className="inline-flex items-center justify-center gap-3">
               <div>
                {loading ? (
                  <>
                    <Skeleton className="h-10 md:h-12 w-48 mx-auto" />
                    <Skeleton className="mt-2 h-4 w-72 mx-auto" />
                  </>
                ) : (
                  <>
                    <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight">
                      Scrims
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      Encontre treinos abertos e participe em minutos
                    </p>
                  </>
                )}
              </div>
            </div>

              <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
               <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-card/70 rounded-lg border border-border">
                 {loading ? <Skeleton className="h-4 w-20" /> : <span className="text-foreground">{totals.total} scrims</span>}
               </div>
              {totals.live > 0 && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-card/70 rounded-lg border border-border">
                  <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                  <span className="text-foreground">{totals.live} ao vivo</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 pb-10">
        {/* Followed organizers */}
        {userId && showFollowed && (
          <section className="mb-8">
            <Card className="p-4 bg-card/50 border-border">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="font-bold uppercase">Organizadores que sigo</h2>
                  <p className="text-sm text-muted-foreground">
                    Acesse rápido os organizadores que você acompanha.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => followed.refetch()}>
                    Atualizar
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowFollowed(false)}>
                    Ocultar
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {followed.loading ? (
                  <p className="text-sm text-muted-foreground">Carregando…</p>
                ) : followed.organizers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Você ainda não segue nenhum organizador.</p>
                ) : (
                  followed.organizers.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => navigate(`/profile/${o.id}`)}
                      className="text-left"
                    >
                      <Card className="p-3 bg-background/50 border-border hover:border-primary/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden flex items-center justify-center">
                            {o.avatar_url ? (
                              <img
                                src={o.avatar_url}
                                alt={o.full_name ? `Avatar de ${o.full_name}` : "Avatar do organizador"}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <DefaultAvatarMark className="h-6 w-6 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="font-semibold uppercase truncate">
                                {o.full_name || "Organizador"}
                              </div>
                              {o.organizer_verified ? <OrganizerBadge variant="icon" size="sm" /> : null}
                            </div>
                            {o.username ? (
                              <div className="text-xs text-muted-foreground truncate">@{o.username}</div>
                            ) : null}
                          </div>
                        </div>
                      </Card>
                    </button>
                  ))
                )}
              </div>
            </Card>
          </section>
        )}

        {!showFollowed && userId && (
          <section className="mb-8">
            <Button variant="outline" size="sm" onClick={() => setShowFollowed(true)}>
              Mostrar organizadores que sigo
            </Button>
          </section>
        )}

        {/* Filters */}
        <section className="bg-card/50 border border-border rounded-xl p-4 mb-8">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-sm font-medium">
              <span>Filtros</span>
            </div>

            {loading ? (
              <div className="flex flex-wrap gap-3">
                <Skeleton className="h-10 w-[160px]" />
                <Skeleton className="h-10 w-[140px]" />
                <Skeleton className="h-10 w-[170px]" />
                <Skeleton className="h-10 w-[170px]" />
                <Skeleton className="h-9 w-20" />
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-[160px] bg-background/40">
                    <SelectValue placeholder="Data" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as datas</SelectItem>
                    <SelectItem value="today">Hoje</SelectItem>
                    <SelectItem value="tomorrow">Amanhã</SelectItem>
                    <SelectItem value="week">Esta semana</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={modeFilter} onValueChange={setModeFilter}>
                  <SelectTrigger className="w-[140px] bg-background/40">
                    <SelectValue placeholder="Modo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os modos</SelectItem>
                    <SelectItem value="Solo">Solo</SelectItem>
                    <SelectItem value="Duo">Duo</SelectItem>
                    <SelectItem value="Squad">Squad</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={gameFilter} onValueChange={setGameFilter}>
                  <SelectTrigger className="w-[170px] bg-background/40">
                    <SelectValue placeholder="Jogo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os jogos</SelectItem>
                    <SelectItem value="free_fire">Free Fire</SelectItem>
                    <SelectItem value="blood_strike">Blood Strike</SelectItem>
                    <SelectItem value="farlight_84">Farlight 84</SelectItem>
                    <SelectItem value="prime_rush">Prime Rush</SelectItem>
                    <SelectItem value="battlefield_6">Battlefield 6</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={platformFilter} onValueChange={setPlatformFilter}>
                  <SelectTrigger className="w-[170px] bg-background/40">
                    <SelectValue placeholder="Plataforma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas plataformas</SelectItem>
                    <SelectItem value="PC">PC</SelectItem>
                    <SelectItem value="Mobile">Mobile</SelectItem>
                    <SelectItem value="console">Console</SelectItem>
                    <SelectItem value="Misto">Misto</SelectItem>
                  </SelectContent>
                </Select>

                {hasActiveFilters && (
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Limpar
                  </Button>
                )}
              </div>
            )}
          </div>
        </section>

        {loading ? (
          <>
            <section className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-destructive/30" />
                  <h2 className="text-base md:text-lg font-bold uppercase tracking-wide">Ao vivo</h2>
                </div>
                <span className="text-sm text-muted-foreground">Carregando…</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <TrainingCardSkeleton key={`live-${i}`} />
                ))}
              </div>
            </section>

            <section>
              <div className="flex items-end justify-between mb-4 gap-4 flex-wrap">
                <div>
                  <h2 className="text-base md:text-lg font-bold uppercase tracking-wide">Próximas scrims</h2>
                  <p className="text-sm text-muted-foreground">Carregando lista</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 9 }).map((_, i) => (
                  <TrainingCardSkeleton key={`up-${i}`} />
                ))}
              </div>
            </section>
          </>
        ) : (
          <>
            {liveTrainings.length > 0 && (
              <section className="mb-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-destructive animate-pulse" />
                    <h2 className="text-base md:text-lg font-bold uppercase tracking-wide">
                      Ao vivo
                    </h2>
                  </div>
                  <span className="text-sm text-muted-foreground">Atualizando em tempo real</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {liveTrainings.map((training) => (
                    <TrainingCard key={training.id} training={training} />
                  ))}
                </div>
              </section>
            )}

            {filteredTrainings.length === 0 ? (
              <section className="text-center py-20">
                <h3 className="text-xl font-semibold mb-2">Nenhuma scrim encontrada</h3>
                <p className="text-muted-foreground mb-6">
                  Tente ajustar os filtros ou volte mais tarde.
                </p>
                {hasActiveFilters && (
                  <Button variant="outline" onClick={clearFilters}>
                    Limpar filtros
                  </Button>
                )}
              </section>
            ) : (
              <section>
                <div className="flex items-end justify-between mb-4 gap-4 flex-wrap">
                  <div>
                    <h2 className="text-base md:text-lg font-bold uppercase tracking-wide">
                      Próximas scrims
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {filteredTrainings.length} resultado{filteredTrainings.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredTrainings.map((training) => (
                    <TrainingCard key={training.id} training={training} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </MainLayout>
  );
};

export default Scrims;
