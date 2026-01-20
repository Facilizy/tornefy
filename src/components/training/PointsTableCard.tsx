import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Medal } from "lucide-react";

type PositionPoint = { position: number; points: number };

function parseFromText(text: string): PositionPoint[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const points: PositionPoint[] = [];

  for (const line of lines) {
    // Examples:
    // 1º lugar: 12 pontos
    // 2 lugar: 9
    const m = line.match(/^(\d+)(?:\s*[ºo])?(?:\s*lugar)?\s*:\s*(\d+)/i);
    if (!m) continue;
    points.push({ position: Number(m[1]), points: Number(m[2]) });
  }

  return points;
}

export function PointsTableCard({
  pointsPerKill,
  pointsPerPosition,
  pointsPerPositionText,
  primaryColor,
}: {
  pointsPerKill: number;
  pointsPerPosition: any;
  pointsPerPositionText?: string | null;
  primaryColor?: string;
}) {
  const rows = useMemo(() => {
    const arr: PositionPoint[] = Array.isArray(pointsPerPosition)
      ? pointsPerPosition
          .map((p: any) => ({ position: Number(p.position), points: Number(p.points) }))
          .filter((p: any) => Number.isFinite(p.position) && Number.isFinite(p.points))
      : [];

    if (arr.length > 0) return arr.sort((a, b) => a.position - b.position);
    if (pointsPerPositionText) return parseFromText(pointsPerPositionText);
    return [];
  }, [pointsPerPosition, pointsPerPositionText]);

  return (
    <Card className="p-6 bg-card/80 border-border">
      <h3 className="font-semibold mb-2 flex items-center gap-2">
        <Medal className="w-5 h-5" style={{ color: primaryColor }} />
        Tabela de Pontos
      </h3>
      <p className="text-xs text-muted-foreground">Colocação + kills (visual).</p>

      <Separator className="my-4" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-lg border bg-background/50 p-4">
          <div className="text-xs text-muted-foreground">Pontos por kill</div>
          <div className="mt-1 text-2xl font-black" style={{ color: primaryColor }}>
            {pointsPerKill} <span className="text-base font-bold">pts</span>
          </div>
        </div>

        <div className="lg:col-span-2 rounded-lg border bg-background/50">
          {rows.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">Sem tabela cadastrada ainda.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Colocação</TableHead>
                  <TableHead>Pontos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, idx) => (
                  <TableRow key={r.position}>
                    <TableCell className="font-semibold">{r.position}º</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="text-xs"
                        style={{ borderColor: primaryColor, color: primaryColor }}
                      >
                        {r.points} pts
                      </Badge>
                      {idx < 3 && <span className="ml-2 text-xs text-muted-foreground">Top {idx + 1}</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </Card>
  );
}
