import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, ChevronUp, Calendar, Clock, Users, Gamepad2, Bug } from "lucide-react";
import { getGameLabel } from "@/lib/games";
import { BugReportDialog } from "@/components/bug-report/BugReportDialog";
import { createPortal } from "react-dom";


interface UpcomingScrim {
  id: string;
  name: string;
  datetime: string;
  max_slots: number;
  registrations: number;
  game?: string;
}

export const UpcomingScrimWidget = () => {
  const navigate = useNavigate();
  const [scrim, setScrim] = useState<UpcomingScrim | null>(null);
  const [bugOpen, setBugOpen] = useState(false);
  // Ensure `position: fixed` anchors to viewport even when parents have transforms (Sheet/Dialogs).
  // Hooks must be declared before any early returns.
  const portalTarget = useMemo(() => {
    if (typeof document === "undefined") return null;
    return document.body;
  }, []);
  const [isMinimized, setIsMinimized] = useState(() => {
    try {
      return localStorage.getItem("upcoming_scrim_minimized") === "1";
    } catch {
      return false;
    }
  });
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
    const { data: sessionData } = await supabase.auth.getSession();

    let preferredGames: string[] | null = null;

    if (sessionData.session?.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("preferred_games")
        .eq("id", sessionData.session.user.id)
        .maybeSingle();

      if (profile && Array.isArray(profile.preferred_games)) {
        preferredGames = profile.preferred_games.filter(
          (g: any): g is string => typeof g === "string"
        );
      }
    }

    let query = supabase
      .from("trainings")
      .select(
        `
        id,
        name,
        datetime,
        max_slots,
        game,
        training_registrations(count)
      `
      )
      .gt("datetime", new Date().toISOString())
      .order("datetime", { ascending: true })
      .limit(1);

    if (preferredGames && preferredGames.length > 0) {
      query = query.in("game", preferredGames as any);
    }

    const { data, error } = await query.maybeSingle();

    if (data && !error) {
      setScrim({
        id: data.id,
        name: data.name,
        datetime: data.datetime,
        max_slots: data.max_slots,
        registrations: data.training_registrations?.[0]?.count || 0,
        game: data.game || undefined,
      });
    }
  };

  if (isClosed) return null;

  const scrimDate = scrim?.datetime ? new Date(scrim.datetime) : null;

  const content = (
    <div className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-4 z-40 flex flex-col gap-2 items-stretch">
      {/* No mobile: hide the scrim card, keep only debug */}
      {scrim ? (
        <Card className="hidden sm:block bg-card border-border shadow-xl overflow-hidden w-full max-w-80">
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
              onClick={() =>
                setIsMinimized((v) => {
                  const next = !v;
                  try {
                    localStorage.setItem("upcoming_scrim_minimized", next ? "1" : "0");
                  } catch {
                    // ignore
                  }
                  return next;
                })
              }
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
        {!isMinimized && scrimDate && (
          <div className="p-4 space-y-4">
            {/* Scrim Info */}
            <div>
              <h3 className="font-bold text-foreground line-clamp-1">
                {scrim.name}
              </h3>
              {scrim.game && (
                <p className="text-xs text-primary font-semibold mt-1 uppercase">
                  {getGameLabel(scrim.game)}
                </p>
              )}
              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Intl.DateTimeFormat("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                   }).format(scrimDate)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Intl.DateTimeFormat("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                    hour: "2-digit",
                    minute: "2-digit",
                   }).format(scrimDate)}
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
              onClick={() => navigate(`/scrim/${scrim.id}`)}
            >
              Ver Detalhes
            </Button>
          </div>
        )}
        </Card>
      ) : null}

      {/* Botão de debug pequeno abaixo do card */}
      <div className="sm:w-full sm:max-w-80 flex justify-end">
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-10 w-10 rounded-full bg-background/40 backdrop-blur border-primary/30 text-primary hover:bg-primary/10"
          onClick={() => setBugOpen(true)}
          aria-label="Reportar bug"
          title="Reportar bug"
        >
          <Bug className="h-4 w-4" />
        </Button>
      </div>

      <BugReportDialog open={bugOpen} onOpenChange={setBugOpen} />
    </div>
  );

  if (!portalTarget) return content;
  return createPortal(content, portalTarget);
};

export default UpcomingScrimWidget;
