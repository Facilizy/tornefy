import { Card } from "@/components/ui/card";
import { SocialLinksChips } from "@/components/SocialLinksChips";
import { Button } from "@/components/ui/button";
import { IntegratedGamesChips } from "@/components/IntegratedGamesChips";
import { ExternalLink, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { hexToHslTriplet } from "@/lib/color";
import type { CSSProperties } from "react";
import { DefaultAvatarMark } from "@/components/DefaultAvatarMark";

export function ProfileTeamCard({
  team,
}: {
  team:
    | {
        id: string;
        name: string | null;
        tag: string | null;
        logo_url?: string | null;
        banner_url?: string | null;
        bio?: string | null;
        region?: string | null;
        primary_color?: string | null;
        discord_url?: string | null;
        twitter_url?: string | null;
        instagram_url?: string | null;
        youtube_url?: string | null;
        integrated_games?: unknown;
      }
    | null;
}) {
  const navigate = useNavigate();

  if (!team?.id) return null;

  const teamPrimaryTriplet =
    (team.primary_color ? hexToHslTriplet(team.primary_color) : null) || "var(--primary)";

  return (
    <div
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      style={{ ["--team-primary" as any]: teamPrimaryTriplet } as CSSProperties}
    >
      <Card className="overflow-hidden bg-card border-border">
        {/* Banner */}
        <div
          className="h-24 relative"
          style={{
            background: team.banner_url
              ? `url(${team.banner_url}) center/cover`
              : `linear-gradient(135deg, hsl(var(--team-primary) / 0.55) 0%, hsl(var(--team-primary) / 0.18) 100%)`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/40 to-transparent" />

          <div className="absolute top-3 right-3 h-10 w-10 rounded-xl border border-border bg-background/40 backdrop-blur flex items-center justify-center">
            <Users className="h-5 w-5 text-muted-foreground" />
          </div>

          {/* Logo */}
          <div className="absolute -bottom-8 left-4">
            <div className="w-16 h-16 rounded-lg bg-card border-2 border-background overflow-hidden flex items-center justify-center shadow-lg">
              {team.logo_url ? (
                <img
                  src={team.logo_url}
                  alt={team.name || team.tag || "Logo do time"}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="h-full w-full grid place-items-center bg-background/40">
                  <DefaultAvatarMark className="h-7 w-7 text-muted-foreground" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="pt-10 pb-4 px-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Time</p>
          <p className="mt-1 font-black uppercase tracking-tight text-lg">
            {team.name || team.tag || "Equipe"}
          </p>
          {team.tag ? <p className="text-xs text-muted-foreground">[{team.tag}]</p> : null}

          {team.bio ? (
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{team.bio}</p>
          ) : null}

          <IntegratedGamesChips
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            gameIds={(team as any)?.integrated_games}
            className="mt-3"
            variant="icons"
            size="md"
          />

          <SocialLinksChips links={team} className="mt-3" />

          <div className="mt-3 flex items-center justify-between gap-3">
            {team.region ? (
              <span className="text-xs text-muted-foreground">{team.region}</span>
            ) : (
              <span />
            )}
            <Button
              variant="outline"
              className="w-full justify-center"
              onClick={() => navigate(`/team/${team.id}`)}
            >
              Ver perfil do time
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
