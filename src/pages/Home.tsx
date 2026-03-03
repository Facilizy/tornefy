import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/MainLayout";
import TrainingCard from "@/components/TrainingCard";
import WeekCalendar from "@/components/WeekCalendar";
import JoinCommunity from "@/components/JoinCommunity";
import FollowUsSection from "@/components/FollowUsSection";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { isSameDay } from "date-fns";
import { getCanonicalOrigin, setSeo, setJsonLd } from "@/lib/seo";
import { HeroSection } from "@/components/home/HeroSection";
import { GamesShowcase } from "@/components/home/GamesShowcase";
import { NextLevelSection } from "@/components/home/NextLevelSection";
import { FeedbackSection } from "@/components/home/FeedbackSection";
import heroBg from "@/assets/hero-bg-ref.png";
import { withOrganizerMeta } from "@/lib/training-organizer-meta";

const Home = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [userGames, setUserGames] = useState<string[]>([]);

  const [scrims, setScrims] = useState<any[]>([]);
  const [liveScrims, setLiveScrims] = useState<any[]>([]);
  const [filteredScrims, setFilteredScrims] = useState<any[]>([]);

  const [gameFilter, setGameFilter] = useState<string>("all");
  const [calendarDateFilter, setCalendarDateFilter] = useState<Date | null>(null);

  useEffect(() => {
    checkUser();
    fetchScrims();

    setSeo({
      title: "Tornefy — Plataforma de Torneios Competitivos",
      description:
        "Tornefy é a plataforma que conecta organizadores verificados e jogadores para torneios competitivos de Free Fire, Blood Strike, Prime Rush e mais.",
      canonical: getCanonicalOrigin() + "/",
    });

    const origin = getCanonicalOrigin();

    setJsonLd("org", {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Tornefy",
      url: origin + "/",
    });

    setJsonLd("home", {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Tornefy",
      url: origin + "/",
      potentialAction: {
        "@type": "SearchAction",
        target: origin + "/scrims?search={search_term_string}",
        "query-input": "required name=search_term_string",
      },
    });
  }, []);

  useEffect(() => {
    filterScrims();
  }, [scrims, gameFilter, userGames, calendarDateFilter]);

  const checkUser = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      setUser(session.user);
      // Fetch user's preferred games
      const { data: profile } = await supabase
        .from("profiles")
        .select("preferred_games")
        .eq("id", session.user.id)
        .single();

      if (profile?.preferred_games) {
        const pg: any = profile.preferred_games;
        const games: string[] = Array.isArray(pg)
          ? pg.map(String)
          : typeof pg === "string"
            ? (() => {
                try {
                  const parsed = JSON.parse(pg);
                  return Array.isArray(parsed) ? parsed.map(String) : [];
                } catch {
                  return [];
                }
              })()
            : [];
        setUserGames(games);
      }
    }
  };

  const fetchScrims = async () => {
    try {
      const scrimsRes = await supabase
        .from("trainings")
        .select(`*, kind, training_registrations(count)`)
        .gte("datetime", new Date().toISOString())
        .order("datetime", { ascending: true });

      if (scrimsRes.error) throw scrimsRes.error;

      const scrimsWithCount = (scrimsRes.data || []).map((s: any) => ({
        ...s,
        registrations: s.training_registrations?.[0]?.count || 0,
      }));

      const enriched = await withOrganizerMeta(scrimsWithCount);

      setScrims(enriched || []);
      setLiveScrims((enriched?.filter((t: any) => t.is_live) || []) as any[]);
    } catch (error) {
      console.error("Erro ao carregar scrims:", error);
    }
  };

  const filterScrims = () => {
    let filtered = [...scrims];

    if (calendarDateFilter) {
      filtered = filtered.filter((t) => {
        if (!t?.datetime) return false;
        return isSameDay(new Date(t.datetime), calendarDateFilter);
      });
    }

    if (gameFilter !== "all") {
      filtered = filtered.filter((t) => t.game === gameFilter);
    } else if (user && userGames.length > 0) {
      // Auto-filter by user's preferred games when logged in
      const preferredScrims = filtered.filter((t) => userGames.includes(t.game));
      if (preferredScrims.length > 0) {
        const otherScrims = filtered.filter((t) => !userGames.includes(t.game));
        filtered = [...preferredScrims, ...otherScrims];
      }
    }

    filtered.sort((a, b) => String(a.datetime || "").localeCompare(String(b.datetime || "")));

    setFilteredScrims(filtered);
  };

  const calendarLabel = useMemo(() => {
    if (!calendarDateFilter) return null;
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
    }).format(calendarDateFilter);
  }, [calendarDateFilter]);

  const scrollToScrims = () => {
    const el = document.getElementById("scrims");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <MainLayout showFooter showUpcomingScrimWidget>
      <HeroSection backgroundImageUrl={heroBg} onPrimaryCta={() => scrollToScrims()} />

      <GamesShowcase
        onSelectGame={(id) => {
          setGameFilter(id);
          scrollToScrims();
        }}
      />

      <NextLevelSection />

      <section id="scrims" className="relative container mx-auto px-4 py-10">
        <WeekCalendar
          trainings={scrims}
          onSelectDate={(date) => {
            setCalendarDateFilter(date);
          }}
        />

        {calendarDateFilter && (
          <div className="mt-2 mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-card/40 px-5 py-4">
            <div>
              <p className="text-sm text-muted-foreground">Mostrando scrims do dia</p>
              <p className="text-lg font-extrabold text-foreground">{calendarLabel}</p>
            </div>
            <Button variant="outline" onClick={() => setCalendarDateFilter(null)} className="gap-2">
              <X className="h-4 w-4" />
              Limpar data
            </Button>
          </div>
        )}

        <div className="flex items-end justify-between gap-3 mb-6">
          <div>
            <h2 className="text-3xl font-black tracking-tight">Próximas Scrims</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Treinos e torneios — tudo no mesmo formato.
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/scrims")}>
            Ver todos
          </Button>
        </div>

        {liveScrims.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-destructive text-2xl">●</span>
              <h3 className="text-2xl font-bold text-primary">Ao Vivo</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
              {liveScrims.map((training) => (
                <TrainingCard key={training.id} training={training} />
              ))}
            </div>
          </div>
        )}

        {filteredScrims.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">Nenhuma scrim encontrada</p>
            {!calendarDateFilter && (
              <Button variant="outline" className="mt-4" onClick={() => navigate("/scrims")}>
                Ver página de scrims
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
            {filteredScrims.map((scrim) => (
              <TrainingCard key={scrim.id} training={scrim} />
            ))}
          </div>
        )}
      </section>

      <FeedbackSection />

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-40 w-[60rem] -translate-x-1/2 bg-primary/10 blur-3xl" />
        </div>
        <FollowUsSection />
        <JoinCommunity />
      </section>
    </MainLayout>
  );
};

export default Home;
