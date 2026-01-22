import { Card } from "@/components/ui/card";
import { Users } from "lucide-react";
import { RankPill } from "@/components/ranking/RankPill";
import type { RankTierId } from "@/lib/ranking";

export type RankingPlayer = {
  user_id: string;
  points: number;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  team_tag: string | null;
  kd: number | null;
  tierId: RankTierId;
};

export function RankingPodium({
  players,
  onOpenProfile,
}: {
  players: RankingPlayer[];
  onOpenProfile: (userId: string) => void;
}) {
  if (players.length < 3) return null;
  const [p1, p2, p3] = players;

  const PodiumCard = ({ p, emphasis }: { p: RankingPlayer; emphasis?: boolean }) => (
    <button type="button" onClick={() => onOpenProfile(p.user_id)} className="text-left">
      <Card
        className={
          "relative overflow-hidden p-5 md:p-6 bg-card/50 border-border hover:border-primary/40 transition-colors " +
          (emphasis ? "border-primary/35" : "")
        }
      >
        {emphasis ? (
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/18 via-transparent to-transparent" />
        ) : null}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-card border border-border overflow-hidden flex items-center justify-center shrink-0">
            {p.avatar_url ? (
              <img
                src={p.avatar_url}
                alt={p.full_name || p.username || "Avatar"}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <Users className="w-6 h-6 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-extrabold uppercase truncate">{p.full_name || p.username || "Jogador"}</p>
              <RankPill tierId={p.tierId} />
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 flex-wrap">
              {p.username ? <span>@{p.username}</span> : null}
              {p.team_tag ? <span>• [{p.team_tag}]</span> : null}
              {typeof p.kd === "number" ? <span>• K/D {p.kd.toFixed(2)}</span> : null}
            </div>
          </div>
          <div className="text-right">
            <p className={"text-2xl font-black leading-none " + (emphasis ? "text-primary" : "")}>{p.points}</p>
            <p className="text-xs text-muted-foreground">pontos</p>
          </div>
        </div>
      </Card>
    </button>
  );

  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-6">
      <PodiumCard p={p2} />
      <PodiumCard p={p1} emphasis />
      <PodiumCard p={p3} />
    </section>
  );
}

