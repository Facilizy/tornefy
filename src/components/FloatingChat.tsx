import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, X, Send, Loader2, Minimize2, Maximize2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { buildNotificationRow } from "@/lib/notifications";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Message {
  id: string;
  message: string;
  created_at: string;
  sender_id: string;
}

interface FloatingChatProps {
  trainingId: string;
  isOrganizer: boolean;
  primaryColor?: string;
  chatEnabled?: boolean;
  chatDisabledReason?: string;
  organizerName?: string | null;
  organizerAvatarUrl?: string | null;
}

export function FloatingChat({
  trainingId,
  isOrganizer,
  primaryColor = "#9146FF",
  chatEnabled = true,
  chatDisabledReason,
  organizerName,
  organizerAvatarUrl,
}: FloatingChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastReadRef = useRef<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchMessages();
      setUnreadCount(0);
    }
  }, [isOpen, trainingId]);

  useEffect(() => {
    if (!chatEnabled && isOpen) {
      setIsOpen(false);
      setIsMinimized(false);
      toast.error(chatDisabledReason || "Chat indisponível no momento");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatEnabled]);

  useEffect(() => {
    // Subscribe to realtime messages
    const channel = supabase
      .channel(`chat-${trainingId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "training_messages",
          filter: `training_id=eq.${trainingId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => [...prev, newMsg]);
          
          if (!isOpen) {
            setUnreadCount((prev) => prev + 1);
          }
          
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [trainingId, isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 100);
  };

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("training_messages")
        .select("*")
        .eq("training_id", trainingId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatEnabled) {
      toast.error(chatDisabledReason || "Chat indisponível no momento");
      return;
    }

    if (!newMessage.trim() || !isOrganizer) return;

    try {
      setSending(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Você precisa estar logado");
        return;
      }

      const { error } = await supabase.from("training_messages").insert({
        training_id: trainingId,
        sender_id: user.id,
        message: newMessage.trim(),
      });

      if (error) throw error;

      // Create notifications for confirmed teams (owners) about new message
      try {
        const senderId = user.id;
        const { data: regs } = await supabase
          .from("training_registrations")
          .select("teams ( owner_id )")
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
        // ignore
      }

      setNewMessage("");
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast.error("Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg z-50"
        style={{ backgroundColor: primaryColor }}
        size="icon"
        disabled={!chatEnabled}
      >
        <MessageCircle className="w-6 h-6" />
        {unreadCount > 0 && (
          <Badge
            className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center bg-destructive text-xs"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </Badge>
        )}
      </Button>
    );
  }

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 bg-card border border-border rounded-2xl shadow-2xl z-50 transition-all duration-300",
        isMinimized ? "w-72 h-14" : "w-80 sm:w-96 h-[500px] max-h-[80vh]"
      )}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between p-3 rounded-t-2xl"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="flex items-center gap-2 text-white min-w-0">
          <MessageCircle className="w-5 h-5 flex-shrink-0" />
          <Avatar className="h-7 w-7 border border-white/20">
            <AvatarImage src={organizerAvatarUrl || undefined} alt={organizerName || "Organizador"} />
            <AvatarFallback>{String(organizerName || "O").trim().slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-none truncate">{organizerName || "Chat do Treino"}</p>
            <p className="text-[11px] text-white/80 truncate">Organizador</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 text-white hover:bg-white/20"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? (
              <Maximize2 className="w-4 h-4" />
            ) : (
              <Minimize2 className="w-4 h-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 text-white hover:bg-white/20"
            onClick={() => setIsOpen(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-3 space-y-3"
            style={{ height: "calc(100% - 120px)" }}
          >
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: primaryColor }} />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <MessageCircle className="w-10 h-10 mb-2 opacity-50" />
                <p className="text-sm">Nenhuma mensagem ainda</p>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const key = msg.id ?? `${msg.sender_id}-${idx}`;
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="truncate">
                        enviado por {organizerName ? `@${organizerName}` : "@organizador"}
                      </span>
                      <Badge variant="secondary" className="text-[10px] h-5">Organizador</Badge>
                    </div>
                    <div 
                      className="rounded-lg p-3 border-l-2"
                      style={{ 
                        backgroundColor: `${primaryColor}15`,
                        borderLeftColor: primaryColor 
                      }}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {msg.created_at ? format(new Date(msg.created_at), "dd/MM HH:mm", { locale: ptBR }) : ""}
                    </p>
                  </div>
                );
              })
            )}
          </div>

          {/* Input */}
          {isOrganizer && (
            <div className="p-3 border-t border-border">
              <div className="flex gap-2">
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Digite sua mensagem..."
                  className="min-h-[40px] max-h-[80px] resize-none text-sm"
                  rows={1}
                   disabled={!chatEnabled}
                />
                <Button
                  onClick={handleSendMessage}
                   disabled={!newMessage.trim() || sending || !chatEnabled}
                  size="icon"
                  className="flex-shrink-0"
                  style={{ backgroundColor: primaryColor }}
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          )}

          {!isOrganizer && (
            <div className="p-3 border-t border-border text-center">
              <p className="text-xs text-muted-foreground">
                Apenas o organizador pode enviar mensagens
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
