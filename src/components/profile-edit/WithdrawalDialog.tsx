import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

type WithdrawalDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    availableBalance: number;
    onSuccess?: () => void;
};

export function WithdrawalDialog({
    open,
    onOpenChange,
    availableBalance,
    onSuccess,
}: WithdrawalDialogProps) {
    const [amount, setAmount] = useState("");
    const [pixKey, setPixKey] = useState("");
    const [loading, setLoading] = useState(false);

    const parsedAmount = Number(amount);
    const isValidAmount = parsedAmount > 0 && parsedAmount <= availableBalance;
    const canSubmit = isValidAmount && pixKey.trim().length > 0 && !loading;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!canSubmit) return;

        try {
            setLoading(true);

            // For now, show a message that withdrawals are coming soon
            // In the future, this will call the database function
            toast.info("Funcionalidade de saque em desenvolvimento. Em breve você poderá solicitar saques!");

            onOpenChange(false);
            setAmount("");
            setPixKey("");
        } catch (error: any) {
            console.error("Error requesting withdrawal:", error);
            toast.error(error.message || "Erro ao solicitar saque. Tente novamente.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black uppercase">Solicitar Saque</DialogTitle>
                    <DialogDescription>
                        Retire seus TorneCoins disponíveis via PIX.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="rounded-lg border border-border bg-background/20 p-4">
                        <p className="text-xs uppercase tracking-widest text-muted-foreground">Saldo disponível</p>
                        <p className="mt-1 text-2xl font-black text-emerald-500">{availableBalance} TC</p>
                    </div>

                    <Separator />

                    <div>
                        <Label htmlFor="withdrawal_amount">Valor do saque</Label>
                        <div className="mt-1 flex items-center gap-2 rounded-xl border border-border bg-background/20 px-3 py-2">
                            <span className="text-sm font-semibold text-muted-foreground">TC</span>
                            <Input
                                id="withdrawal_amount"
                                type="number"
                                min="1"
                                max={availableBalance}
                                className="h-9 border-0 bg-transparent px-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0"
                                required
                            />
                        </div>
                        {parsedAmount > availableBalance && (
                            <div className="mt-2 flex items-center gap-2 text-xs text-red-500">
                                <AlertCircle className="h-3 w-3" />
                                <span>Valor maior que o saldo disponível</span>
                            </div>
                        )}
                    </div>

                    <div>
                        <Label htmlFor="pix_key">Chave PIX</Label>
                        <Input
                            id="pix_key"
                            className="mt-1 bg-background/20"
                            value={pixKey}
                            onChange={(e) => setPixKey(e.target.value)}
                            placeholder="CPF, e-mail, telefone ou chave aleatória"
                            required
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                            Digite sua chave PIX para receber o valor.
                        </p>
                    </div>

                    <Separator />

                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
                        <div className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                            <div className="text-xs text-amber-200/90">
                                <p className="font-semibold">Processamento manual</p>
                                <p className="mt-1">
                                    Os saques são processados manualmente pela equipe. O prazo pode variar de 1 a 3 dias úteis.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={() => onOpenChange(false)}
                            disabled={loading}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1 gap-2 bg-gradient-primary"
                            disabled={!canSubmit}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Processando...
                                </>
                            ) : (
                                "Solicitar saque"
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
