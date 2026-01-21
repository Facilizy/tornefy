import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NotificationList } from "@/components/NotificationList";
import { Trash2 } from "lucide-react";

type FilterKey = "all" | "convites" | "mensagens" | "sistema";

const inviteTypes = new Set(["team_invite", "invite_accepted", "invite_rejected"]);
const messageTypes = new Set(["chat_message"]);

export default function Notifications() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [filter, setFilter] = useState<FilterKey>("all");

  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        navigate("/auth?mode=login", { replace: true });
        return;
      }
      setUserId(session.user.id);
    })();
  }, [navigate]);

  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearRead,
  } = useNotifications(userId);

  const filtered = useMemo(() => {
    if (filter === "all") return notifications;
    if (filter === "convites") return notifications.filter((n) => inviteTypes.has(n.type));
    if (filter === "mensagens") return notifications.filter((n) => messageTypes.has(n.type));
    // sistema
    return notifications.filter((n) => !inviteTypes.has(n.type) && !messageTypes.has(n.type));
  }, [notifications, filter]);

  const hasRead = useMemo(() => notifications.some((n) => n.read), [notifications]);

  return (
    <MainLayout>
      <main className="container max-w-4xl mx-auto px-4 py-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-black uppercase">Notificações</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0
              ? `Você tem ${unreadCount} não lida${unreadCount === 1 ? "" : "s"}.`
              : "Tudo em dia por aqui."}
          </p>
        </header>

        <Separator className="my-6" />

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-4">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterKey)}>
            <TabsList>
              <TabsTrigger value="all">Todas</TabsTrigger>
              <TabsTrigger value="convites">Convites</TabsTrigger>
              <TabsTrigger value="mensagens">Mensagens</TabsTrigger>
              <TabsTrigger value="sistema">Sistema</TabsTrigger>
            </TabsList>
            <TabsContent value={filter} />
          </Tabs>

          <div className="flex gap-2">
            {hasRead && (
              <Button
                type="button"
                variant="outline"
                onClick={clearRead}
                disabled={loading}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Limpar lidas
              </Button>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card/50 overflow-hidden">
          <NotificationList
            notifications={filtered}
            loading={loading}
            onMarkAsRead={markAsRead}
            onMarkAllAsRead={markAllAsRead}
            onDelete={deleteNotification}
            onClose={() => {}}
          />
        </div>
      </main>
    </MainLayout>
  );
}
