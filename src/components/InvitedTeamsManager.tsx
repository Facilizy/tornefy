import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";
import { DefaultAvatarMark } from "@/components/DefaultAvatarMark";

type TeamCard = {
  tag: string;
  name?: string | null;
  logo_url?: string | null;
};

function parseTags(input: string) {
  return input
    .split(/[\s,]+/)
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean)
    .map((t) => t.replace(/[^A-Z0-9_]/g, "").slice(0, 10));
}

export function InvitedTeamsManager({
  trainingId,
  primaryColor,
  isPrivate,
  invitedTags,
  onSaved,
}: {
  trainingId: string;
  primaryColor: string;
  isPrivate: boolean;
  invitedTags: string[];
  onSaved: () => void;
}) {
  const [input, setInput] = useState(invitedTags.join(", "));
  const [saving, setSaving] = useState(false);
  const [cards, setCards] = useState<TeamCard[]>([]);

  useEffect(() => {
    setInput(invitedTags.join(", "));
  }, [invitedTags]);

  const tags = useMemo(() => parseTags(input), [input]);

  useEffect(() => {
    const load = async () => {
      if (!isPrivate || tags.length === 0) {
        setCards(tags.map((t) => ({ tag: t })));
        return;
      }

      const { data, error } = await supabase
        .from("teams")
        .select("tag, name, logo_url")
        .in("tag", tags);

      if (error) {
        setCards(tags.map((t) => ({ tag: t })));
        return;
      }

      const byTag = new Map((data || []).map((t: any) => [t.tag, t]));
      setCards(
        tags.map((t) => {
          const found = byTag.get(t);
          return {
            tag: t,
            name: found?.name || null,
            logo_url: found?.logo_url || null,
          };
        })
      );
    };

    load();
  }, [isPrivate, tags.join("|")]);

  const removeTag = (tag: string) => {
    const next = tags.filter((t) => t !== tag);
    setInput(next.join(", "));
  };

  const handleSave = async () => {
    if (!isPrivate) {
      toast.error("Ative 'Treino Privado' para configurar convidados.");
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase
        .from("trainings")
        .update({ invited_tags: tags })
        .eq("id", trainingId);

      if (error) throw error;
      toast.success("Convidados atualizados!");
      onSaved();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar convidados");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6 bg-card/80 border-border">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-semibold">Convidados</h3>
          <p className="text-xs text-muted-foreground">
            Mostramos nome, TAG e logo da equipe para ficar fácil revisar e remover.
          </p>
        </div>
        {!isPrivate && (
          <Badge variant="outline" className="text-xs">
            Treino não é privado
          </Badge>
        )}
      </div>

      <Separator className="my-4" />

      <div className="space-y-3">
        <Label className="text-sm">TAGs das equipes convidadas</Label>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ex: ABC, DEF, GHI"
          disabled={!isPrivate}
        />
        <p className="text-[11px] text-muted-foreground">
          Separe por espaço ou vírgula. Mantemos tudo em maiúsculo.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {cards.length === 0 ? (
            <div className="text-xs text-muted-foreground">Nenhum convidado ainda.</div>
          ) : (
            cards.map((t) => (
              <div
                key={t.tag}
                className="flex items-center gap-3 rounded-lg border bg-background/50 p-3"
              >
                {t.logo_url ? (
                  <img
                    src={t.logo_url}
                    alt={t.name ? `Logo da equipe ${t.name}` : `Logo da equipe ${t.tag}`}
                    className="h-10 w-10 rounded-md object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-md border bg-muted/40 flex items-center justify-center">
                    <DefaultAvatarMark className="h-5 w-5 text-muted-foreground" title={`Logo padrão da equipe ${t.tag}`} />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm uppercase truncate">
                    {t.name || "Equipe"}
                  </div>
                  <div className="text-xs text-muted-foreground uppercase">[{t.tag}]</div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => removeTag(t.tag)}
                  disabled={!isPrivate}
                  aria-label={`Remover ${t.tag}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>

        <div className="pt-2">
          <Button
            onClick={handleSave}
            disabled={saving || !isPrivate}
            style={{ backgroundColor: primaryColor }}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar convidados"
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
