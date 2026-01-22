import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function BugReportDialog({ open, onOpenChange }: Props) {
  const location = useLocation();
  const navigate = useNavigate();

  const pagePath = useMemo(() => {
    // Remove tokens/params de debug (ex: __lovable_token) para não poluir UI nem salvar dado sensível
    const params = new URLSearchParams(location.search || "");
    params.delete("__lovable_token");

    const search = params.toString();
    return `${location.pathname}${search ? `?${search}` : ""}${location.hash || ""}`;
  }, [location.pathname, location.search, location.hash]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);

  const canSubmit = title.trim().length >= 4 && description.trim().length >= 10;

  const reset = () => {
    setTitle("");
    setDescription("");
  };

  const handleSubmit = async () => {
    try {
      setSending(true);

      const { data: userRes, error: uErr } = await supabase.auth.getUser();
      if (uErr) throw uErr;
      if (!userRes.user) {
        toast.error("Você precisa estar logado para reportar um bug.");
        onOpenChange(false);
        navigate("/auth?mode=login");
        return;
      }

      const ua = typeof navigator !== "undefined" ? navigator.userAgent : null;
      const referrer = typeof document !== "undefined" ? document.referrer : null;

      const { error } = await supabase.from("bug_reports").insert({
        user_id: String(userRes.user.id),
        page_path: pagePath,
        title: title.trim(),
        description: description.trim(),
        user_agent: ua,
        meta: {
          referrer,
          timezone:
            typeof Intl !== "undefined"
              ? Intl.DateTimeFormat().resolvedOptions().timeZone
              : null,
        },
      });
      if (error) throw error;

      toast.success("Bug reportado! Obrigado 🙌");
      reset();
      onOpenChange(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Erro ao enviar bug");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-black tracking-tight">Reportar bug</DialogTitle>
          <DialogDescription>
            Encontrou um problema? Descreva o bug para que possamos corrigir.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold">Título do bug</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Botão não funciona na página de perfil"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold">Descrição</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              placeholder="Descreva o que aconteceu, o que você esperava que acontecesse e os passos para reproduzir o bug..."
            />
          </div>

          <p className="text-xs text-muted-foreground">Página atual: {pagePath}</p>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleSubmit}
            disabled={!canSubmit || sending}
          >
            {sending ? "Enviando..." : "Enviar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
