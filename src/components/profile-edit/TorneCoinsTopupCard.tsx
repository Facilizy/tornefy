import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Loader2, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { PaymentMethodLogo, type PaymentMethodLogoKind } from "@/components/payments/PaymentMethodLogo";

const MIN_BRL = 5;

type PaymentMethod = "auto" | "card" | "pix" | "boleto" | "gpay" | "applepay";

const METHOD_OPTIONS: Array<{
  value: PaymentMethod;
  title: string;
  description: string;
  logo: PaymentMethodLogoKind;
}> = [
    {
      value: "auto",
      title: "Automático",
      description: "Mostra o que estiver disponível",
      logo: "auto",
    },
    {
      value: "pix",
      title: "PIX",
      description: "QR Code / Copia e cola",
      logo: "pix",
    },
    {
      value: "card",
      title: "Cartão",
      description: "Crédito / débito",
      logo: "card",
    },
    {
      value: "gpay",
      title: "Google Pay",
      description: "Wallet (via cartão)",
      logo: "gpay",
    },
    {
      value: "applepay",
      title: "Apple Pay",
      description: "Wallet (via cartão)",
      logo: "applepay",
    },
    {
      value: "boleto",
      title: "Boleto",
      description: "Pode levar mais tempo",
      logo: "boleto",
    },
  ];

export function TorneCoinsTopupCard({
  className,
  defaultAmount = MIN_BRL,
}: {
  className?: string;
  defaultAmount?: number;
}) {
  const [amountBrl, setAmountBrl] = useState(String(defaultAmount));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("auto");
  const [loading, setLoading] = useState(false);

  const parsed = useMemo(() => {
    const n = Number(String(amountBrl).replace(",", "."));
    const int = Math.floor(n);
    return Number.isFinite(int) ? int : 0;
  }, [amountBrl]);

  const canSubmit = parsed >= MIN_BRL && !loading;

  const startCheckout = async () => {
    try {
      if (parsed < MIN_BRL) {
        toast.error(`Valor mínimo é R$ ${MIN_BRL},00`);
        return;
      }

      setLoading(true);
      const requestMethod =
        paymentMethod === "gpay" || paymentMethod === "applepay" ? "card" : paymentMethod;

      const { data, error } = await supabase.functions.invoke("tornecoins-topup-create", {
        body: { coins_amount: parsed, payment_method: requestMethod },
      });
      if (error) throw error;

      const url = (data as any)?.url as string | undefined;
      if (!url) throw new Error("Checkout não retornou URL");
      window.location.assign(url);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Erro ao iniciar pagamento");
      setLoading(false);
    }
  };

  return (
    <Card className={"p-5 bg-card/40 border-border " + (className ?? "")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Recarga</p>
          <h2 className="mt-1 text-lg font-black uppercase truncate">Adicionar TorneCoins</h2>
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
            <span className="rounded-full border border-border bg-background/30 px-2 py-1">Cartão</span>
            <span className="rounded-full border border-border bg-background/30 px-2 py-1">PIX</span>
            <span className="rounded-full border border-border bg-background/30 px-2 py-1">Boleto</span>
            <span className="rounded-full border border-border bg-background/30 px-2 py-1">Wallets</span>
          </div>
        </div>
        <div className="shrink-0 rounded-xl border border-border bg-background/20 px-3 py-2 text-right">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Paridade</p>
          <p className="text-sm font-black">1 TC = R$ 1</p>
        </div>
      </div>

      <Separator className="my-4" />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto]">
        <div className="space-y-4">
          <div>
            <Label htmlFor="topup_amount">Valor</Label>
            <div className="mt-1 flex items-center gap-2 rounded-xl border border-border bg-background/20 px-3 py-2">
              <span className="text-sm font-semibold text-muted-foreground">R$</span>
              <Input
                id="topup_amount"
                className="h-9 border-0 bg-transparent px-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                inputMode="numeric"
                value={amountBrl}
                onChange={(e) => setAmountBrl(e.target.value)}
                placeholder={String(MIN_BRL)}
              />
            </div>
          </div>

          <div>
            <Label>Forma de pagamento</Label>
            <ToggleGroup
              type="single"
              value={paymentMethod}
              onValueChange={(v) => setPaymentMethod((v as PaymentMethod) || "auto")}
              className="mt-2 grid w-full grid-cols-2 gap-2 md:grid-cols-3"
            >
              {METHOD_OPTIONS.map((m) => (
                <ToggleGroupItem
                  key={m.value}
                  value={m.value}
                  aria-label={m.title}
                  className={
                    "!h-auto !min-h-[110px] !w-full !items-start !justify-start rounded-xl border border-border bg-background/20 p-4 text-left " +
                    "data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-foreground"
                  }
                >
                  <div className="flex w-full items-start gap-3">
                    <div className="mt-0.5 rounded-xl border border-border bg-background/30 p-3 text-foreground">
                      <PaymentMethodLogo kind={m.logo} className="h-7 w-7" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold leading-none text-foreground">{m.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{m.description}</p>
                    </div>
                  </div>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <p className="mt-2 text-xs text-muted-foreground">
              Mínimo: R$ {MIN_BRL},00 • Se o método escolhido não estiver disponível no Stripe, vamos abrir no modo
              automático.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:w-[220px]">
          <div className="rounded-xl border border-border bg-background/20 p-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Você recebe</p>
            <p className="mt-1 text-2xl font-black">{Math.max(0, parsed)} TC</p>
            <p className="mt-1 text-xs text-muted-foreground">Crédito após confirmação.</p>
          </div>

          <Button
            type="button"
            className="w-full justify-center gap-2 bg-gradient-primary"
            disabled={!canSubmit}
            onClick={startCheckout}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
            {loading ? "Abrindo checkout…" : "Recarregar"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
