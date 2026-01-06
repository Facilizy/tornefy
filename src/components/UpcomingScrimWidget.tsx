import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, ChevronUp, Calendar, Clock, Users, Gamepad2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface UpcomingScrim {
  id: string;
  name: string;
  datetime: string;
  max_slots: number;
  registrations: number;
}

export const UpcomingScrimWidget = () => {
  const navigate = useNavigate();
  const [scrim, setScrim] = useState<UpcomingScrim | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    fetchNextScrim();
  }, []);

  useEffect(() => {
    if (!scrim) return;

    const updateCountdown = () => {
      const now = new Date().getTime();
      const target = new Date(scrim.datetime).getTime();
      const difference = target - now;

      if (difference > 0) {
        setCountdown({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
        });
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [scrim]);

  const fetchNextScrim = async () => {
    const { data, error } = await supabase
      .from("trainings")
      .select(`
        id,
        name,
        datetime,
        max_slots,
        training_registrations(count)
      `)
      .gt("datetime", new Date().toISOString())
      .order("datetime", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (data && !error) {
      setScrim({
        id: data.id,
        name: data.name,
        datetime: data.datetime,
        max_slots: data.max_slots,
        registrations: data.training_registrations?.[0]?.count || 0,
      });
    }
  };

  if (isClosed || !scrim) return null;

  const scrimDate = new Date(scrim.datetime);

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <Card className="bg-card border-border shadow-xl overflow-hidden w-80">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-primary/10 border-b border-border">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">Próxima Scrim</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsMinimized(!isMinimized)}
            >
              <ChevronUp className={`w-4 h-4 transition-transform ${isMinimized ? "rotate-180" : ""}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsClosed(true)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        {!isMinimized && (
          <div className="p-4 space-y-4">
            {/* Scrim Info */}
            <div>
              <h3 className="font-bold text-foreground line-clamp-1">{scrim.name}</h3>
              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(scrimDate, "dd MMM", { locale: ptBR })}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {format(scrimDate, "HH:mm")}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {scrim.max_slots - scrim.registrations} vagas
                </span>
              </div>
            </div>

            {/* Countdown */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">COMEÇA EM</p>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: countdown.days, label: "D" },
                  { value: countdown.hours, label: "H" },
                  { value: countdown.minutes, label: "M" },
                  { value: countdown.seconds, label: "S" },
                ].map((item, index) => (
                  <div
                    key={index}
                    className="bg-background/50 border border-primary/30 rounded-lg p-2 text-center"
                  >
                    <span className="text-lg font-bold text-primary">
                      {String(item.value).padStart(2, "0")}
                    </span>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <Button
              className="w-full bg-primary hover:bg-primary/90"
              onClick={() => navigate(`/training/${scrim.id}`)}
            >
              Ver Detalhes
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default UpcomingScrimWidget;
