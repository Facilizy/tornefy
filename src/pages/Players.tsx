import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Search, Loader2 } from "lucide-react";
import TeamTagBadge from "@/components/TeamTagBadge";

type PlayerProfile = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  team?: {
    id: string;
    tag: string;
    primary_color: string | null;
  } | null;
};

const Players = () => {
  const navigate = useNavigate();
  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const supportsIntersectionObserver =
    typeof window !== "undefined" && "IntersectionObserver" in window;

  const PAGE_SIZE = 48;
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const fetchPage = async ({ offset, append }: { offset: number; append: boolean }) => {
    const isFirst = offset === 0;
    try {
      if (isFirst) setLoading(true);
      else setLoadingMore(true);

      const { data, error, count } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url", { count: isFirst ? "exact" : undefined })
        .order("created_at", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);
      if (error) throw error;

      if (isFirst && typeof count === "number") setTotalCount(count);

      const basePlayers = (data || []) as PlayerProfile[];
      const userIds = basePlayers.map((p) => p.id).filter(Boolean);

      if (userIds.length === 0) {
        if (!append) setPlayers([]);
        setHasMore(false);
        return;
      }

      // Find the player's "main team" as the oldest team_members row for that user.
      const { data: memberRows, error: tmError } = await supabase
        .from("team_members")
        .select("user_id, team_id, created_at")
        .in("user_id", userIds)
        .order("created_at", { ascending: true });

      if (tmError) throw tmError;

      const mainTeamByUser = new Map<string, string>();
      (memberRows || []).forEach((row: any) => {
        if (!row?.user_id || !row?.team_id) return;
        // because we sorted ascending, first occurrence is the oldest (main team)
        if (!mainTeamByUser.has(row.user_id)) mainTeamByUser.set(row.user_id, row.team_id);
      });

      const teamIds = Array.from(new Set(Array.from(mainTeamByUser.values())));
      const teamsById = new Map<string, { id: string; tag: string; primary_color: string | null }>();

      if (teamIds.length > 0) {
        const { data: teamsData, error: tError } = await supabase
          .from("teams")
          .select("id, tag, primary_color")
          .in("id", teamIds);
        if (tError) throw tError;

        (teamsData || []).forEach((t: any) => {
          if (!t?.id) return;
          teamsById.set(t.id, {
            id: t.id,
            tag: t.tag || "",
            primary_color: t.primary_color ?? null,
          });
        });
      }

      const pagePlayers = basePlayers.map((p) => {
        const teamId = mainTeamByUser.get(p.id);
        const team = teamId ? teamsById.get(teamId) : undefined;
        return { ...p, team: team ?? null };
      });

      setPlayers((prev) => (append ? [...prev, ...pagePlayers] : pagePlayers));
      setHasMore(basePlayers.length === PAGE_SIZE);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchPage({ offset: 0, append: false });
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setSearchTerm(searchInput), 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (!loadMoreRef.current) return;
    if (!hasMore) return;
    if (!supportsIntersectionObserver) return;

    const el = loadMoreRef.current;
    const obs = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;
        if (loading || loadingMore) return;
        fetchPage({ offset: players.length, append: true });
      },
      { rootMargin: "600px" }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [players.length, hasMore, loading, loadingMore, supportsIntersectionObserver]);

  const filteredPlayers = useMemo(() => {
    if (!searchTerm) return players;
    const term = searchTerm.toLowerCase();
    return players.filter((p) => {
      const uname = (p.username || "").toLowerCase();
      const fname = (p.full_name || "").toLowerCase();
      return uname.includes(term) || fname.includes(term);
    });
  }, [players, searchTerm]);

  return (
    <MainLayout>
      <header className="relative py-14 mb-8 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/16 via-transparent to-transparent" />
        <div className="container mx-auto px-4 relative z-10 text-center">
          <div className="inline-flex items-center justify-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight">Jogadores</h1>
          </div>
          <p className="text-muted-foreground max-w-md mx-auto">
            Veja quem já tem conta criada na plataforma
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 pb-10">
        <section className="mb-8 bg-card/50 border border-border rounded-xl p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou @username..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10 bg-background/40"
            />
          </div>
        </section>

        {!loading && (totalCount ?? 0) > 0 && (
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Mostrando <span className="font-semibold text-foreground">{filteredPlayers.length}</span> de{" "}
              <span className="font-semibold text-foreground">{totalCount}</span>
            </p>
          </div>
        )}

        {loading ? (
          <div className="min-h-[40vh] flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredPlayers.length === 0 ? (
          <section className="text-center py-16">
            <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold mb-2">Nenhum jogador encontrado</h2>
            <p className="text-muted-foreground">Tente ajustar a busca</p>
          </section>
        ) : (
          <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 justify-items-center">
            {filteredPlayers.map((p) => (
              <Card
                key={p.id}
                className="w-[232px] p-4 bg-card border-border hover:border-primary/30 transition-all cursor-pointer"
                onClick={() => navigate(`/profile/${p.id}`)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden flex items-center justify-center">
                    {p.avatar_url ? (
                      <img
                        src={p.avatar_url}
                        alt={p.full_name ? `Avatar de ${p.full_name}` : "Avatar do jogador"}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <Users className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="font-bold uppercase truncate">{p.full_name || "Jogador"}</div>

                      {p.team?.tag ? (
                        <TeamTagBadge
                          className="shrink-0"
                          tag={p.team.tag}
                          primaryColor={p.team.primary_color}
                        />
                      ) : null}
                    </div>
                    <div className="text-sm text-muted-foreground truncate">@{p.username || "sem-username"}</div>
                  </div>
                </div>
              </Card>
            ))}
          </section>
        )}

        {!loading && filteredPlayers.length > 0 && (
          <div className="mt-10 flex flex-col items-center gap-3">
            {loadingMore ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Carregando mais...
              </div>
            ) : hasMore ? (
              supportsIntersectionObserver ? (
                <p className="text-xs text-muted-foreground">Role para carregar mais jogadores</p>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => fetchPage({ offset: players.length, append: true })}
                  disabled={loadingMore}
                >
                  Carregar mais
                </Button>
              )
            ) : (
              <p className="text-xs text-muted-foreground">Fim da lista</p>
            )}
            <div ref={loadMoreRef} className="h-1 w-full" />
          </div>
        )}
      </main>
    </MainLayout>
  );
};

export default Players;
