import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Gamepad2, Monitor, Target, Trophy } from "lucide-react";
import { Loader2 } from "lucide-react";
import { getGameLabel } from "@/lib/games";

interface RegistrationConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  training: any;
  teamName: string;
  loading: boolean;
  lines?: { id: string; name: string }[];
  selectedLineId?: string;
  onChangeLine?: (lineId: string) => void;
}

export const RegistrationConfirmDialog = ({
  open,
  onOpenChange,
  onConfirm,
  training,
  teamName,
  loading,
  lines = [],
  selectedLineId,
  onChangeLine,
}: RegistrationConfirmDialogProps) => {
  const [agreed, setAgreed] = useState(false);

  const requiresLineSelection = lines.length > 0;
  const hasSelectedLine = !requiresLineSelection || !!selectedLineId;

  const handleConfirm = async () => {
    if (!agreed) return;
    if (!hasSelectedLine) return;
    await onConfirm();
    setAgreed(false);
  };

  const getPlatformIcon = (platform: string) => {
    return platform === "PC" || platform === "Misto" ? (
      <Monitor className="w-4 h-4" />
    ) : (
      <Gamepad2 className="w-4 h-4" />
    );
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Confirmar inscrição</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Você está prestes a inscrever sua equipe neste scrim.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Team and Training Info */}
          <div className="space-y-2">
            <div className="text-sm">
              <span className="text-muted-foreground">Equipe: </span>
              <span className="font-semibold text-primary">{teamName}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Scrim: </span>
              <span className="font-semibold">{training.name}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Entrada: </span>
              <span className="font-semibold">
                {Number(training.entry_fee_coins || 0) > 0 ? `${Number(training.entry_fee_coins)} TC` : "Gratuito"}
              </span>
            </div>
            {Number(training.entry_fee_coins || 0) > 0 ? (
              <div className="text-xs text-muted-foreground">
                A taxa é debitada automaticamente via TorneCoins no momento da inscrição.
              </div>
            ) : null}
          </div>

          <Separator />

          {/* Training Details */}
          <div className="space-y-3 bg-muted/30 p-4 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="font-medium">
                {format(new Date(training.datetime), "dd/MM/yyyy 'às' HH:mm", {
                  locale: ptBR,
                })}
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Trophy className="w-4 h-4 text-primary" />
              <span>
                <span className="text-muted-foreground">Jogo: </span>
                <span className="font-medium">{getGameLabel(training.game)}</span>
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              {getPlatformIcon(training.platform)}
              <span>
                <span className="text-muted-foreground">Plataforma: </span>
                <span className="font-medium">{training.platform}</span>
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Target className="w-4 h-4 text-primary" />
              <span>
                <span className="text-muted-foreground">Modo: </span>
                <span className="font-medium">{training.mode}</span>
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Gamepad2 className="w-4 h-4 text-primary" />
              <span>
                <span className="text-muted-foreground">Quedas: </span>
                <span className="font-medium">{training.rounds}</span>
              </span>
            </div>
          </div>

          <Separator />

          {/* Line selection (optional) */}
          {lines.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm">Selecione a line que irá jogar</Label>
              <div className="grid grid-cols-1 gap-2">
                {lines.map((line) => {
                  const selected = selectedLineId === line.id;
                  return (
                    <button
                      key={line.id}
                      type="button"
                      onClick={() => onChangeLine && onChangeLine(line.id)}
                      className={`flex items-center justify-between px-3 py-2 rounded-md border text-sm transition-colors ${
                        selected
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <span>{line.name}</span>
                      {selected && (
                        <span className="text-xs text-primary font-medium">Selecionada</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <Separator />

          {/* Terms Agreement */}
          <div className="flex items-start space-x-3 p-3 bg-muted/20 rounded-lg">
            <Checkbox
              id="terms"
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(checked as boolean)}
            />
            <Label
              htmlFor="terms"
              className="text-sm leading-relaxed cursor-pointer"
            >
              Confirmo que li e concordo com os direitos e regras do treino e
              da plataforma Tornefy, e estou ciente de todas as informações
              acima.
            </Label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setAgreed(false);
            }}
            disabled={loading}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!agreed || loading || !hasSelectedLine}
            className="flex-1 bg-gradient-primary"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Inscrevendo...
              </>
            ) : requiresLineSelection && !selectedLineId ? (
              "Selecione a line"
            ) : (
              "Confirmar Inscrição"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
