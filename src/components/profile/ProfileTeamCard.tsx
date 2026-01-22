import { Card } from "@/components/ui/card";
import { SocialLinksChips } from "@/components/SocialLinksChips";
import { Button } from "@/components/ui/button";
import { ExternalLink, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function ProfileTeamCard({
  team,
}: {
  team:
    | {
        id: string;
        name: string | null;
        tag: string | null;
        discord_url?: string | null;
        twitter_url?: string | null;
        instagram_url?: string | null;
        youtube_url?: string | null;
      }
    | null;
}) {
  const navigate = useNavigate();

  if (!team?.id) return null;

  return (
    <Card className="p-5 bg-card/50 border-border">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Time</p>
          <p className="mt-1 font-black uppercase tracking-tight">
            {team.name || team.tag || "Equipe"}
          </p>
          {team.tag ? (
            <p className="text-xs text-muted-foreground">[{team.tag}]</p>
          ) : null}
        </div>
        <div className="h-10 w-10 rounded-xl border border-border bg-background/40 flex items-center justify-center">
          <Users className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>

      <SocialLinksChips links={team} className="mt-4" />

      <Button
        variant="outline"
        className="mt-4 w-full"
        onClick={() => navigate(`/team/${team.id}`)}
      >
        Ver perfil do time
        <ExternalLink className="ml-2 h-4 w-4" />
      </Button>
    </Card>
  );
}
