import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

function asText(v: unknown) {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

export function UnresolvedPlayersPanel({
  unresolved,
  onGoManual,
}: {
  unresolved: any[];
  onGoManual?: () => void;
}) {
  if (!Array.isArray(unresolved) || unresolved.length === 0) return null;

  return (
    <div className="rounded-lg border bg-card/40 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium">Players não encontrados</p>
          <p className="text-xs text-muted-foreground">
            Esses nicks não foram vinculados a nenhum membro do time. Os abates ficaram apenas no total do time.
          </p>
        </div>
        {onGoManual ? (
          <Button type="button" variant="outline" size="sm" onClick={onGoManual}>
            Preencher manualmente
          </Button>
        ) : null}
      </div>

      <ScrollArea className="mt-3 h-32 rounded-md border bg-background/40 p-2">
        <div className="space-y-2">
          {unresolved.map((u, idx) => {
            const nick = asText(u?.nick_normalizado || u?.nick || u?.name || u?.player_name) || "(sem nick)";
            const kills = u?.abates ?? u?.kills;
            const teamTag = asText(u?.team_tag || u?.tag || u?.dominant_tag);
            const reason = asText(u?.reason || u?.motivo);

            return (
              <div key={`${nick}:${idx}`} className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 px-2 py-1">
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{nick}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {teamTag ? `TAG: ${teamTag}` : "TAG: —"}
                    {reason ? ` • ${reason}` : ""}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[11px]">
                    {typeof kills === "number" ? `Kills: ${kills}` : "Kills: —"}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
