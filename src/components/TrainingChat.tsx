import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Message {
  id: string;
  message: string;
  created_at: string;
}

interface TrainingChatProps {
  trainingId: string;
  isOrganizer: boolean;
}

export const TrainingChat = ({ trainingId, isOrganizer }: TrainingChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
    
    // Subscribe to new messages
    const channel = supabase
      .channel('training-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'training_messages',
          filter: `training_id=eq.${trainingId}`
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [trainingId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from("training_messages")
      .select("*")
      .eq("training_id", trainingId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setMessages(data);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from("training_messages")
        .insert({
          training_id: trainingId,
          message: newMessage.trim()
        });

      if (error) throw error;
      
      setNewMessage("");
      toast.success("Mensagem enviada!");
    } catch (error: any) {
      toast.error("Erro ao enviar mensagem");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4 backdrop-blur-sm bg-card/80 border-border">
      <h3 className="font-semibold mb-3">💬 Chat do Treino</h3>
      
      <ScrollArea className="h-64 mb-3 pr-4" ref={scrollRef}>
        <div className="space-y-3">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma mensagem ainda
            </p>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="bg-background/50 p-3 rounded-lg">
                <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(msg.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {isOrganizer && (
        <div className="space-y-2">
          <Textarea
            placeholder="Digite sua mensagem para as equipes confirmadas..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="resize-none"
            rows={3}
          />
          <Button
            onClick={handleSendMessage}
            disabled={loading || !newMessage.trim()}
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
