import { Card } from "@/components/ui/card";
import { Award } from "lucide-react";

export type ClaimedEmblem = {
  achievementId: string;
  name: string;
};

export function ProfileEmblemsCard({ claimedEmblems }: { claimedEmblems: ClaimedEmblem[] }) {
  return (
    <Card className="p-6 bg-card/50 border-border">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
          <Award className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold uppercase">Emblemas</h3>
          <p className="text-sm text-muted-foreground">
            {claimedEmblems.length > 0 ? `${claimedEmblems.length} resgatados` : "Resgate missões para ganhar"}
          </p>
        </div>
      </div>

      {claimedEmblems.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum emblema resgatado ainda.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {claimedEmblems.map((e) => (
            <span
              key={e.achievementId}
              className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs"
            >
              <Award className="h-3.5 w-3.5 text-primary" />
              <span className="font-semibold">{e.name}</span>
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}
