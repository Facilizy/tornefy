import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Send, Loader2, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { buildNotificationRow } from "@/lib/notifications";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DefaultAvatarMark } from "@/components/DefaultAvatarMark";

interface Message {
  id: string;
  message: string;
  created_at: string;
  sender_id: string;
}

interface TrainingChatProps {
  trainingId: string;
  isOrganizer: boolean;
  chatEnabled?: boolean;
  chatDisabledReason?: string;
  organizerName?: string | null;
  organizerAvatarUrl?: string | null;
}

export const TrainingChat = ({
  trainingId,
  isOrganizer,
  chatEnabled = true,
  chatDisabledReason,
  organizerName,
  organizerAvatarUrl,
}: TrainingChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [senderProfiles, setSenderProfiles] = useState<Record<string, { username: string | null; full_name: string | null; avatar_url: string | null }>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [newBelowCount, setNewBelowCount] = useState(0);

  const canSend = isOrganizer && chatEnabled;

  useEffect(() => {
    if (!chatEnabled) {
      setEditingId(null);
      setEditText("");
    }
  }, [chatEnabled]);

  useEffect(() => {
    fetchMessages();
    getCurrentUser();
    
    // Subscribe to new messages
    const channel = supabase
      .channel(`training-messages-${trainingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'training_messages',
          filter: `training_id=eq.${trainingId}`
        },
        (payload) => {
          const next = payload.new as Message;
          setMessages(prev => [...prev, payload.new as Message]);
          if (!isAtBottom) setNewBelowCount((c) => c + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'training_messages',
          filter: `training_id=eq.${trainingId}`
        },
        (payload) => {
          setMessages(prev => prev.map(msg => 
            msg.id === payload.new.id ? payload.new as Message : msg
          ));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'training_messages',
          filter: `training_id=eq.${trainingId}`
        },
        (payload) => {
          setMessages(prev => prev.filter(msg => msg.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [trainingId]);

  useEffect(() => {
    if (isAtBottom) scrollToBottom();
    if (isAtBottom) setNewBelowCount(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  useEffect(() => {
    const ids = Array.from(new Set(messages.map((m) => m.sender_id).filter(Boolean)));
    const missing = ids.filter((id) => !senderProfiles[id]);
    if (missing.length === 0) return;

    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .in("id", missing);

      if (error || !data) return;

      setSenderProfiles((prev) => {
        const next = { ...prev };
        for (const row of data as any[]) {
          next[String(row.id)] = {
            username: row.username ?? null,
            full_name: row.full_name ?? null,
            avatar_url: row.avatar_url ?? null,
          };
        }
        return next;
      });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const threshold = 40;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
    setIsAtBottom(atBottom);
    if (atBottom) setNewBelowCount(0);
  };

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const fetchMessages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("training_messages")
      .select("*")
      .eq("training_id", trainingId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setMessages(data);
    }

    setLoading(false);
  };

  const handleSendMessage = async () => {
    if (!canSend) {
      toast.error(chatDisabledReason || "Apenas o organizador pode enviar mensagens agora.");
      return;
    }

    if (!newMessage.trim()) return;

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("training_messages")
        .insert([{
          training_id: trainingId,
          message: newMessage.trim(),
          sender_id: user?.id
        }]);

      if (error) throw error;
      
      setNewMessage("");
      // After sending, always go to the bottom
      setIsAtBottom(true);
      window.setTimeout(() => scrollToBottom(), 0);

      // Create notifications for confirmed teams (owners) about new message
      try {
        const senderId = user?.id;
        const { data: regs } = await supabase
          .from("training_registrations")
          .select("teams ( owner_id, name, tag )")
          .eq("training_id", trainingId);

        const ownerIds = Array.from(
          new Set(
            (regs || [])
              .map((r: any) => r?.teams?.owner_id)
              .filter((oid: any) => oid && oid !== senderId)
          )
        );

        if (ownerIds.length > 0) {
          const title = "Nova mensagem do organizador";
          const msg = newMessage.trim().slice(0, 140);
          const rows = ownerIds.map((uid) =>
            buildNotificationRow({
              user_id: String(uid),
              title,
              message: msg,
              type: "training_message",
              related_id: trainingId,
            })
          );
          await supabase.from("notifications").insert(rows);
        }
      } catch {
        // ignore notification failures
      }

      toast.success("Mensagem enviada!");
    } catch (error: any) {
      toast.error("Erro ao enviar mensagem");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditMessage = async (messageId: string) => {
    if (!canSend) {
      toast.error(chatDisabledReason || "Chat indisponível no momento.");
      return;
    }
    if (!editText.trim()) return;

    try {
      const { error } = await supabase
        .from("training_messages")
        .update({ message: editText.trim() })
        .eq("id", messageId);

      if (error) throw error;
      
      setEditingId(null);
      setEditText("");
      toast.success("Mensagem editada!");
    } catch (error: any) {
      toast.error("Erro ao editar mensagem");
      console.error(error);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!canSend) {
      toast.error(chatDisabledReason || "Chat indisponível no momento.");
      return;
    }
    try {
      const { error } = await supabase
        .from("training_messages")
        .delete()
        .eq("id", messageId);

      if (error) throw error;
      
      toast.success("Mensagem deletada!");
    } catch (error: any) {
      toast.error("Erro ao deletar mensagem");
      console.error(error);
    }
  };

  const startEditing = (message: Message) => {
    if (!canSend) return;
    if (!message.id) return;
    setEditingId(message.id);
    setEditText(message.message);
  };

  const getSenderDisplay = (senderId: string) => {
    const p = senderProfiles[senderId];
    const name = organizerName || p?.username || p?.full_name || "Organizador";
    const username = p?.username || null;
    const avatar = organizerAvatarUrl || p?.avatar_url || null;
    return { name, username, avatar };
  };

  return (
    <Card className="p-4 backdrop-blur-sm bg-card/80 border-border">
      <h3 className="font-semibold mb-3">💬 Chat do Treino</h3>

      {!chatEnabled && (
        <div className="mb-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          {chatDisabledReason || "Chat indisponível no momento."}
        </div>
      )}
      
      <div className="relative h-64 mb-3">
        {newBelowCount > 0 && !isAtBottom && (
          <div className="absolute inset-x-0 top-2 z-10 flex justify-center">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setIsAtBottom(true);
                setNewBelowCount(0);
                scrollToBottom();
              }}
            >
              Novas mensagens ({newBelowCount})
            </Button>
          </div>
        )}

        <div className="h-full overflow-y-auto" ref={scrollRef} onScroll={handleScroll}>
        <div className="space-y-3">
           {loading ? (
             <div className="flex items-center justify-center py-10">
               <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
             </div>
           ) : messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma mensagem ainda
            </p>
          ) : (
             messages.map((msg, idx) => {
               const key = msg.id ?? `${msg.sender_id}-${idx}`;
               const sender = getSenderDisplay(msg.sender_id);
               const isEditing = !!editingId && !!msg.id && editingId === msg.id;
               return (
               <div key={key} className="bg-background/50 p-3 rounded-lg">
                 <div className="flex items-center justify-between gap-3 mb-2">
                   <div className="flex items-center gap-2 min-w-0">
                   <Avatar className="h-7 w-7">
                     <AvatarImage src={sender.avatar || undefined} alt={sender.name || "Organizador"} />
                      <AvatarFallback>
                        <DefaultAvatarMark className="h-4 w-4 text-muted-foreground" title="Avatar padrão" />
                      </AvatarFallback>
                   </Avatar>
                   <div className="min-w-0">
                     <p className="text-sm font-medium leading-none truncate">{sender.name}</p>
                     <p className="text-xs text-muted-foreground truncate">
                       enviado por {sender.username ? `@${sender.username}` : "@organizador"}
                     </p>
                   </div>
                   </div>
                   <Badge variant="secondary" className="text-[10px] h-5">Organizador</Badge>
                 </div>

                 {isEditing ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="resize-none text-sm"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleEditMessage(msg.id)}
                        className="text-xs"
                      >
                        Salvar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingId(null);
                          setEditText("");
                        }}
                        className="text-xs"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-muted-foreground">
                        {msg.created_at
                          ? format(new Date(msg.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                          : ""}
                      </p>
                      {chatEnabled && isOrganizer && currentUserId === msg.sender_id && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEditing(msg)}
                            className="h-6 px-2 text-xs"
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Deletar
                          </Button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
             );
             })
          )}
        </div>
        </div>
      </div>

      {isOrganizer && (
        <div className="space-y-2">
          <Textarea
            placeholder="Digite sua mensagem para as equipes confirmadas..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="resize-none"
            rows={3}
            disabled={!chatEnabled}
          />
          <Button
            onClick={handleSendMessage}
            disabled={loading || !newMessage.trim() || !chatEnabled}
            className="w-full"
            size="sm"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Enviar Mensagem
          </Button>
        </div>
      )}
    </Card>
  );
};
