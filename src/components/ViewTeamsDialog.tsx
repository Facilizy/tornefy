import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle, Shield, Users } from "lucide-react";
import { format } from "date-fns";

type Member = {
  user_id: string;
  display_name: string;
  email: string | null;
  has_verification: boolean;
  verified_at: string | null;
  hwid: string | null;
};

type TeamGroup = {
  team_id: string;
  team_name: string;
  team_tag: string | null;
  members: Member[];
};

type EventLog = {
  id: string | null;
  created_at: string | null;
  team_tag: string | null;
  team_name: string | null;
  action: string | null;
};

type Payload = {
  teams: TeamGroup[];
  eventLogs: EventLog[];
};

export function ViewTeamsDialog({ trainingId }: { trainingId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState<Payload | null>(null);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("training-teams", {
          body: { trainingId },
        });
        if (error) throw error;
        setPayload((data ?? null) as Payload | null);
      } catch (e: any) {
        toast.error(e?.message || "Erro ao carregar equipes");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, trainingId]);

  const teams = useMemo(() => payload?.teams ?? [], [payload]);
  const eventLogs = useMemo(() => payload?.eventLogs ?? [], [payload]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="xs" className="w-full justify-center gap-2">
          <Users className="h-4 w-4" />
          Visualizar Equipes
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Equipes • Anti-Hack • Logs</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="teams" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="teams">Equipes</TabsTrigger>
            <TabsTrigger value="logs">Event Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="teams">
            <ScrollArea className="h-[520px] pr-4">
              {loading ? (
                <div className="py-10 text-center text-sm text-muted-foreground">Carregando...</div>
              ) : teams.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">Nenhuma equipe encontrada.</div>
              ) : (
                <Accordion type="multiple" className="w-full">
                  {teams.map((t) => (
                    <AccordionItem key={t.team_id} value={t.team_id}>
                      <AccordionTrigger>
                        <div className="flex min-w-0 flex-1 items-center justify-between gap-3 pr-2">
                          <div className="min-w-0">
                            <div className="truncate font-semibold">
                              {t.team_name} {t.team_tag ? `• ${t.team_tag}` : ""}
                            </div>
                            <div className="text-xs text-muted-foreground">{t.members.length} membro(s)</div>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Shield className="h-4 w-4" />
                            {t.members.filter((m) => m.has_verification).length}/{t.members.length}
                          </div>
                        </div>
                      </AccordionTrigger>

                      <AccordionContent>
                        <div className="space-y-2">
                          {t.members.map((m) => (
                            <div key={m.user_id} className="rounded-lg border bg-card p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <div className="truncate font-medium">{m.display_name}</div>
                                    {m.has_verification && (
                                      <CheckCircle className="h-4 w-4 text-primary" />
                                    )}
                                  </div>
                                  <div className="mt-1 text-xs text-muted-foreground">
                                    {m.email ? m.email : "email não disponível"}
                                  </div>
                                </div>

                                <div className="text-right text-xs text-muted-foreground">
                                  {m.verified_at ? format(new Date(m.verified_at), "dd/MM/yyyy HH:mm:ss") : "—"}
                                </div>
                              </div>

                              <div className="mt-2 grid gap-2 md:grid-cols-2">
                                <div className="text-xs">
                                  <div className="text-muted-foreground">HWID</div>
                                  <div className="break-all font-mono text-foreground">{m.hwid ?? "—"}</div>
                                </div>
                                <div className="text-xs">
                                  <div className="text-muted-foreground">Status</div>
                                  <div className="text-foreground">{m.has_verification ? "Verificado" : "Não verificado"}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="logs">
            <ScrollArea className="h-[520px] pr-4">
              {loading ? (
                <div className="py-10 text-center text-sm text-muted-foreground">Carregando...</div>
              ) : eventLogs.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">Sem logs.</div>
              ) : (
                <div className="space-y-2">
                  {eventLogs.map((l, idx) => (
                    <div key={`${l.id ?? "log"}-${idx}`} className="max-w-full rounded-lg border bg-card p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">
                            {l.team_name ?? "—"} {l.team_tag ? `• ${l.team_tag}` : ""}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {l.created_at ? format(new Date(l.created_at), "dd/MM/yyyy HH:mm:ss") : "—"}
                          </div>
                        </div>
                      </div>
                      <pre className="mt-2 max-w-full whitespace-pre-wrap break-words rounded-md bg-muted p-2 text-xs text-foreground">
                        {l.action ?? ""}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
