import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Shield, KeyRound, LogOut } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function SecurityPanel({
  email,
  onLoggedOut,
}: {
  email?: string | null;
  onLoggedOut: () => void;
}) {
  const [sendingReset, setSendingReset] = useState(false);
  const [signingOutAll, setSigningOutAll] = useState(false);

  const sendReset = async () => {
    if (!email) {
      toast.error("Não encontramos seu e-mail nesta sessão.");
      return;
    }

    try {
      setSendingReset(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) throw error;
      toast.success("Enviamos um e-mail para redefinir sua senha.");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Erro ao enviar e-mail de redefinição");
    } finally {
      setSendingReset(false);
    }
  };

  const signOutAll = async () => {
    try {
      setSigningOutAll(true);
      await (supabase.auth as any).signOut({ scope: "global" });
      toast.success("Você saiu de todos os dispositivos.");
      onLoggedOut();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Erro ao sair de todos os dispositivos");
    } finally {
      setSigningOutAll(false);
    }
  };

  return (
    <Card className="p-5 bg-card/40 border-border">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-black uppercase">Segurança</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            A Tornefy é extremamente segura — mantenha sua conta protegida com boas práticas.
          </p>
        </div>
      </div>

      <Separator className="my-4" />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-background/20 p-4">
          <p className="text-sm font-semibold">Trocar senha</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Enviaremos um e-mail para você redefinir sua senha com segurança.
          </p>
          <Button type="button" className="mt-3 w-full justify-start gap-2" onClick={sendReset} disabled={sendingReset}>
            {sendingReset ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            Enviar e-mail de redefinição
          </Button>
        </div>

        <div className="rounded-xl border border-border bg-background/20 p-4">
          <p className="text-sm font-semibold">Sair de todos os dispositivos</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Recomendado se você usou um computador público ou suspeita de acesso indevido.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-3 w-full justify-start gap-2"
            onClick={signOutAll}
            disabled={signingOutAll}
          >
            {signingOutAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            Sair de todos
          </Button>
        </div>
      </div>
    </Card>
  );
}
