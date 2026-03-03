import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Trophy, Swords } from "lucide-react";
import { toast } from "sonner";

export type CreateScrimPreset = {
  kind: "training" | "tournament";
  entry_fee_coins: number;
};

export function CreateScrimDialog({
  open,
  onOpenChange,
  onContinue,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue: (preset: CreateScrimPreset) => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [kind, setKind] = useState<CreateScrimPreset["kind"]>("training");
  const [feeMode, setFeeMode] = useState<"free" | "paid">("free");
  const [feeText, setFeeText] = useState<string>("");

  const feeValue = useMemo(() => {
    if (feeMode === "free") return 0;
    const raw = Number(String(feeText || "0").replace(/[^0-9]/g, ""));
    if (!Number.isFinite(raw)) return 0;
    return Math.max(0, Math.min(999999, Math.trunc(raw)));
  }, [feeMode, feeText]);

  const reset = () => {
    setStep(1);
    setKind("training");
    setFeeMode("free");
    setFeeText("");
  };

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (!next) reset();
  };

  const goNext = () => {
    if (feeMode === "paid" && feeValue <= 0) {
      toast.error("Informe um valor válido para scrim pago");
      return;
    }
    setStep(2);
  };

  const handleContinue = () => {
    if (feeMode === "paid" && feeValue <= 0) {
      toast.error("Informe um valor válido para scrim pago");
      return;
    }
    onContinue({ kind, entry_fee_coins: feeValue });
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-card border-border max-w-xl w-[95vw] sm:w-full p-0">
        <div className="flex max-h-[90vh] flex-col">
          <div className="border-b border-border p-5">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-xl font-black uppercase tracking-tight">
                Criar Scrim
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Passo {step} de 2 — primeiro escolha o tipo e se é pago.
              </p>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {step === 1 ? (
              <div className="space-y-6">
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase tracking-wide text-muted-foreground">
                      Tipo
                    </h3>
                    <Separator className="ml-3 flex-1" />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setKind("training")}
                      className={[
                        "rounded-xl border p-4 text-left transition-all",
                        kind === "training"
                          ? "border-primary bg-primary/10"
                          : "border-border bg-background/30 hover:border-primary/50",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-2">
                        <Swords className="h-4 w-4 text-primary" />
                        <span className="font-black uppercase">Treino</span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Scrim padrão (treino) — fluxo igual, sem grupos.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setKind("tournament")}
                      className={[
                        "rounded-xl border p-4 text-left transition-all",
                        kind === "tournament"
                          ? "border-primary bg-primary/10"
                          : "border-border bg-background/30 hover:border-primary/50",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-primary" />
                        <span className="font-black uppercase">Torneio</span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Scrim torneio — permite grupos e organização por chaves.
                      </p>
                    </button>
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase tracking-wide text-muted-foreground">
                      Entrada
                    </h3>
                    <Separator className="ml-3 flex-1" />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <Label>Tipo de entrada</Label>
                      <Select value={feeMode} onValueChange={(v) => setFeeMode(v as any)}>
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">Gratuito</SelectItem>
                          <SelectItem value="paid">Pago (TorneCoins)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Valor</Label>
                      <Input
                        className="mt-2"
                        inputMode="numeric"
                        placeholder={feeMode === "paid" ? "ex: 10" : "0"}
                        disabled={feeMode !== "paid"}
                        value={feeMode === "paid" ? feeText : "0"}
                        onChange={(e) => setFeeText(e.target.value)}
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        {feeMode === "paid"
                          ? "Use números (TorneCoins)."
                          : "Selecione 'Pago' para definir um valor."}
                      </p>
                    </div>
                  </div>
                </section>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Confirme para abrir o formulário de {kind === "training" ? "Treino" : "Torneio"}.
                </p>

                <div className="rounded-xl border border-border bg-background/30 p-4">
                  <p className="text-sm">
                    <span className="font-semibold">Tipo:</span> {kind === "training" ? "Treino" : "Torneio"}
                  </p>
                  <p className="mt-1 text-sm">
                    <span className="font-semibold">Entrada:</span> {feeValue > 0 ? `${feeValue} TorneCoins` : "Gratuito"}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border p-5">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => (step === 1 ? handleOpenChange(false) : setStep(1))}
              >
                {step === 1 ? "Cancelar" : "Voltar"}
              </Button>
              <Button
                type="button"
                className="bg-gradient-primary"
                onClick={step === 1 ? goNext : handleContinue}
              >
                {step === 1 ? "Continuar" : "Criar"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
