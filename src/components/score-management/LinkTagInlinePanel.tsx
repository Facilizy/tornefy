import { useEffect, useMemo, useState } from "react";

import { adminApi } from "@/lib/admin-api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

type ConfirmedTeam = {
  team_id: string;
  name: string | null;
  tag: string | null;
};

function normalizeTag(input: string) {
  return input.trim().toUpperCase().replace(/\s+/g, "").slice(0, 10);
}

export function LinkTagInlinePanel({
  trainingId,
  roundId,
  tag,
  onClose,
  onLinked,
}: {
  trainingId: string;
  roundId: string;
  tag: string;
  onClose: () => void;
  onLinked?: () => void;
}) {
  const [teams, setTeams] = useState<ConfirmedTeam[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [teamId, setTeamId] = useState<string>("");

  const safeTag = useMemo(() => normalizeTag(tag), [tag]);

  useEffect(() => {
    if (!safeTag) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await adminApi<{ items: ConfirmedTeam[] }>(
          `/trainings/${trainingId}/confirmed-teams`,
        );
        if (!mounted) return;
        if (res.ok !== true) throw new Error((res as any).error);
        setTeams(res.data.items || []);
        setTeamId("");
      } catch (e: any) {
        toast.error(e?.message ? String(e.message) : "Erro ao carregar equipes confirmadas");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [safeTag, trainingId]);

  const selectableTeams = useMemo(() => teams, [teams]);

  const submit = async () => {
    if (!safeTag) {
      toast.error("TAG inválida");
      return;
    }
    if (!teamId) {
      toast.error("Selecione a equipe");
      return;
    }
    if (!roundId) {
      toast.error("Rodada inválida");
      return;
    }

    setSaving(true);
    try {
      const res = await adminApi<{ ok: true }>(
        `/trainings/${trainingId}/link-team-tag`,
        {
          method: "POST",
          body: { team_id: teamId, tag: safeTag, round_id: roundId },
        },
      );
      if (res.ok !== true) throw new Error((res as any).error);
      toast.success(`TAG ${safeTag} vinculada!`);
      onLinked?.();
      onClose();
    } catch (e: any) {
      toast.error(e?.message ? String(e.message) : "Erro ao vincular TAG");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border bg-card/40 p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold">Vincular TAG ao time confirmado</p>
          <p className="text-xs text-muted-foreground">
            TAG detectada: <span className="font-medium text-foreground">{safeTag || "—"}</span>
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          Fechar
        </Button>
      </div>

      <Separator className="my-3" />

      <div className="space-y-2">
        <Label>Equipe confirmada</Label>
        <Select value={teamId} onValueChange={setTeamId} disabled={loading}>
          <SelectTrigger>
            <SelectValue placeholder={loading ? "Carregando…" : "Selecione…"} />
          </SelectTrigger>
          <SelectContent>
            {selectableTeams.length === 0 ? (
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                Nenhuma equipe confirmada encontrada.
              </div>
            ) : null}

            {selectableTeams.map((t) => (
              <SelectItem key={t.team_id} value={t.team_id}>
                {t.name || "(Sem nome)"} {t.tag ? `[${t.tag}]` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <p className="text-xs text-muted-foreground">
          Esse vínculo vale <span className="font-medium">somente nesta rodada</span> e <span className="font-medium">não altera</span> a TAG do time.
          Se a TAG já estiver vinculada nesta rodada, o vínculo será substituído.
        </p>
      </div>

      <div className="flex gap-3 pt-3">
        <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="button" className="flex-1" onClick={submit} disabled={saving || loading}>
          {saving ? "Vinculando…" : "Vincular"}
        </Button>
      </div>
    </div>
  );
}
