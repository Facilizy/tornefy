import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Check,
  Gamepad2,
  Calendar,
  Trophy,
  FileText,
  Target,
  Users,
  Eye,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TrainingWizardProps {
  userId: string;
  onCreated: () => void;
}

const STEPS = [
  { id: 1, label: "Básico", icon: Gamepad2 },
  { id: 2, label: "Data & Vagas", icon: Calendar },
  { id: 3, label: "Pontuação", icon: Target },
  { id: 4, label: "Regras", icon: FileText },
  { id: 5, label: "Preview", icon: Eye },
];

const GAMES = [
  { id: "free_fire", name: "Free Fire", logo: "/game-logos/free-fire.png" },
  { id: "blood_strike", name: "Blood Strike", logo: "/game-logos/blood-strike.png" },
  { id: "farlight_84", name: "Farlight 84", logo: "/game-logos/farlight-84.png" },
  { id: "prime_rush", name: "Prime Rush", logo: "/game-logos/prime-rush.png" },
  { id: "battlefield_6", name: "Battlefield 6", logo: "/game-logos/battlefield-6.png" },
];

export const TrainingWizard = ({ userId, onCreated }: TrainingWizardProps) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  const [form, setForm] = useState({
    name: "",
    game: "free_fire" as string,
    mode: "Squad" as "Solo" | "Duo" | "Squad",
    platform: "Mobile" as "PC" | "Mobile" | "Misto",
    datetime: "",
    max_slots: 20,
    rounds: 3,
    points_per_kill: 1,
    points_per_position_text: "1º lugar: 12 pontos\n2º lugar: 9 pontos\n3º lugar: 8 pontos\n4º lugar: 7 pontos\n5º lugar: 6 pontos\n6º lugar: 5 pontos\n7º lugar: 4 pontos\n8º lugar: 3 pontos\n9º lugar: 2 pontos\n10º lugar: 1 ponto",
    rules: "1. Proibido uso de hackers, cheats, exploits ou qualquer programa de vantagem ilegal.\n2. Proibido stream snipe, toxicidade e comportamento antidesportivo.\n3. É obrigatório que todas as equipes estejam preparadas no horário marcado.\n4. Queda iniciada não será reiniciada, exceto em casos de falhas gerais do servidor.\n5. Caso algum jogador caia da partida (crash), a queda continuará normalmente.\n6. Somente valem pontos das equipes confirmadas no treinamento.\n7. É proibido atrasar a partida intencionalmente ou travar o jogo de outros jogadores.\n8. Nome da equipe e dos jogadores devem estar iguais ao formulário de inscrição.\n9. Em caso de empate, o critério de desempate será:\n   a) Maior número de abates no treino\n   b) Melhor colocação na última queda\n10. O descumprimento de qualquer regra pode resultar em punição ou desclassificação.",
    prize: "",
    discord_link: "",
    important_info: "",
    is_private: false,
    banner_url: "",
  });

  const handleNext = () => {
    if (step === 1) {
      if (!form.name.trim()) {
        toast.error("Digite o nome do treino");
        return;
      }
    }
    if (step === 2) {
      if (!form.datetime) {
        toast.error("Selecione a data e horário");
        return;
      }
    }
    setStep(Math.min(step + 1, STEPS.length));
  };

  const handleBack = () => {
    setStep(Math.max(step - 1, 1));
  };

  const uploadFile = async (file: File, bucket: string, path: string) => {
    if (file.size > 5 * 1024 * 1024) {
      throw new Error("O arquivo deve ter no máximo 5MB");
    }

    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, file, { cacheControl: "3600", upsert: true });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
    return publicUrl;
  };

  const handleCreate = async () => {
    try {
      setSaving(true);

      let bannerUrl = form.banner_url;
      if (bannerFile) {
        const fileName = `${userId}/${Date.now()}_${bannerFile.name}`;
        bannerUrl = await uploadFile(bannerFile, "training-banners", fileName);
      }

      const { error } = await supabase.from("trainings").insert([{
        name: form.name,
        game: form.game as "free_fire" | "blood_strike" | "farlight_84" | "prime_rush" | "battlefield_6",
        mode: form.mode,
        platform: form.platform,
        datetime: form.datetime,
        max_slots: form.max_slots,
        rounds: form.rounds,
        points_per_kill: form.points_per_kill,
        points_per_position: [],
        points_per_position_text: form.points_per_position_text,
        rules: form.rules,
        prize: form.prize || null,
        discord_link: form.discord_link || null,
        important_info: form.important_info || null,
        is_private: form.is_private,
        banner_url: bannerUrl || null,
        organizer_id: userId,
        status: "INSCRIÇÕES ABERTAS",
      }]);

      if (error) throw error;

      toast.success("Treino criado com sucesso!");
      setOpen(false);
      resetForm();
      onCreated();
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar treino");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setForm({
      name: "",
      game: "free_fire",
      mode: "Squad",
      platform: "Mobile",
      datetime: "",
      max_slots: 20,
      rounds: 3,
      points_per_kill: 1,
      points_per_position_text: "1º lugar: 12 pontos\n2º lugar: 9 pontos\n3º lugar: 8 pontos\n4º lugar: 7 pontos\n5º lugar: 6 pontos\n6º lugar: 5 pontos\n7º lugar: 4 pontos\n8º lugar: 3 pontos\n9º lugar: 2 pontos\n10º lugar: 1 ponto",
      rules: "1. Proibido uso de hackers, cheats, exploits ou qualquer programa de vantagem ilegal.\n2. Proibido stream snipe, toxicidade e comportamento antidesportivo.\n3. É obrigatório que todas as equipes estejam preparadas no horário marcado.\n4. Queda iniciada não será reiniciada, exceto em casos de falhas gerais do servidor.\n5. Caso algum jogador caia da partida (crash), a queda continuará normalmente.\n6. Somente valem pontos das equipes confirmadas no treinamento.\n7. É proibido atrasar a partida intencionalmente ou travar o jogo de outros jogadores.\n8. Nome da equipe e dos jogadores devem estar iguais ao formulário de inscrição.\n9. Em caso de empate, o critério de desempate será:\n   a) Maior número de abates no treino\n   b) Melhor colocação na última queda\n10. O descumprimento de qualquer regra pode resultar em punição ou desclassificação.",
      prize: "",
      discord_link: "",
      important_info: "",
      is_private: false,
      banner_url: "",
    });
    setBannerFile(null);
  };

  const progress = (step / STEPS.length) * 100;

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-primary gap-2">
          <Sparkles className="w-4 h-4" />
          Criar Treino
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full p-0">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Trophy className="w-5 h-5 text-primary" />
              Criar Novo Treino
            </DialogTitle>
          </DialogHeader>

          {/* Step Indicators */}
          <div className="mt-4">
            <Progress value={progress} className="h-2 mb-4" />
            <div className="flex justify-between">
              {STEPS.map((s) => (
                <div 
                  key={s.id}
                  className={`flex flex-col items-center gap-1 ${
                    s.id === step 
                      ? "text-primary" 
                      : s.id < step 
                        ? "text-primary/60" 
                        : "text-muted-foreground"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    s.id === step 
                      ? "bg-primary text-primary-foreground" 
                      : s.id < step 
                        ? "bg-primary/20 text-primary" 
                        : "bg-muted text-muted-foreground"
                  }`}>
                    {s.id < step ? <Check className="w-4 h-4" /> : s.id}
                  </div>
                  <span className="text-xs hidden sm:block">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div className="p-6 min-h-[300px]">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <Label htmlFor="name" className="text-base">Nome do Treino *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Treino Competitivo - Squad"
                  className="mt-2"
                />
              </div>

              <div>
                <Label className="text-base mb-3 block">Jogo</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {GAMES.map((game) => (
                    <div
                      key={game.id}
                      onClick={() => setForm({ ...form, game: game.id })}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        form.game === game.id
                          ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <img src={game.logo} alt={game.name} className="w-8 h-8 rounded object-cover" />
                      <span className="text-sm font-medium">{game.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Modo</Label>
                  <Select value={form.mode} onValueChange={(v: "Solo" | "Duo" | "Squad") => setForm({ ...form, mode: v })}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Solo">Solo</SelectItem>
                      <SelectItem value="Duo">Duo</SelectItem>
                      <SelectItem value="Squad">Squad</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Plataforma</Label>
                  <Select value={form.platform} onValueChange={(v: "PC" | "Mobile" | "Misto") => setForm({ ...form, platform: v })}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mobile">Mobile</SelectItem>
                      <SelectItem value="PC">PC</SelectItem>
                      <SelectItem value="Misto">Misto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Date & Slots */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <Label htmlFor="datetime" className="text-base">Data e Horário *</Label>
                <Input
                  id="datetime"
                  type="datetime-local"
                  value={form.datetime}
                  onChange={(e) => setForm({ ...form, datetime: e.target.value })}
                  className="mt-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="max_slots" className="text-base">Vagas (Equipes)</Label>
                  <Input
                    id="max_slots"
                    type="number"
                    min={2}
                    max={100}
                    value={form.max_slots}
                    onChange={(e) => setForm({ ...form, max_slots: parseInt(e.target.value) || 20 })}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="rounds" className="text-base">Rodadas</Label>
                  <Input
                    id="rounds"
                    type="number"
                    min={1}
                    max={10}
                    value={form.rounds}
                    onChange={(e) => setForm({ ...form, rounds: parseInt(e.target.value) || 1 })}
                    className="mt-2"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="banner" className="text-base">Banner (opcional)</Label>
                <p className="text-xs text-muted-foreground mb-2">Recomendado: 1920x400px</p>
                <Input
                  id="banner"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setBannerFile(e.target.files?.[0] || null)}
                  className="mt-1"
                />
                {bannerFile && (
                  <p className="text-xs text-muted-foreground mt-1">{bannerFile.name}</p>
                )}
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <Label htmlFor="is_private" className="text-base">Treino Privado</Label>
                  <p className="text-xs text-muted-foreground">Apenas equipes convidadas podem participar</p>
                </div>
                <Switch
                  id="is_private"
                  checked={form.is_private}
                  onCheckedChange={(c) => setForm({ ...form, is_private: c })}
                />
              </div>
            </div>
          )}

          {/* Step 3: Scoring */}
          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <Label htmlFor="points_per_kill" className="text-base">Pontos por Abate</Label>
                <Input
                  id="points_per_kill"
                  type="number"
                  min={0}
                  value={form.points_per_kill}
                  onChange={(e) => setForm({ ...form, points_per_kill: parseInt(e.target.value) || 0 })}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="points_per_position_text" className="text-base">Pontos por Colocação</Label>
                <p className="text-xs text-muted-foreground mb-2">Descreva os pontos por posição</p>
                <Textarea
                  id="points_per_position_text"
                  value={form.points_per_position_text}
                  onChange={(e) => setForm({ ...form, points_per_position_text: e.target.value })}
                  rows={8}
                  className="mt-1 font-mono text-sm"
                />
              </div>

              <div>
                <Label htmlFor="prize" className="text-base">Premiação (opcional)</Label>
                <Textarea
                  id="prize"
                  value={form.prize}
                  onChange={(e) => setForm({ ...form, prize: e.target.value })}
                  placeholder="Ex: 1º lugar: R$100 PIX\n2º lugar: R$50 PIX"
                  rows={3}
                  className="mt-2"
                />
              </div>
            </div>
          )}

          {/* Step 4: Rules */}
          {step === 4 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <Label htmlFor="rules" className="text-base">Regras do Treino</Label>
                <p className="text-xs text-muted-foreground mb-2">As regras serão exibidas para os participantes</p>
                <Textarea
                  id="rules"
                  value={form.rules}
                  onChange={(e) => setForm({ ...form, rules: e.target.value })}
                  rows={10}
                  className="mt-1 font-mono text-sm"
                />
              </div>

              <div>
                <Label htmlFor="important_info" className="text-base">Informações Importantes (opcional)</Label>
                <Textarea
                  id="important_info"
                  value={form.important_info}
                  onChange={(e) => setForm({ ...form, important_info: e.target.value })}
                  placeholder="Informações adicionais que os jogadores devem saber"
                  rows={3}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="discord_link" className="text-base">Link do Discord (opcional)</Label>
                <Input
                  id="discord_link"
                  value={form.discord_link}
                  onChange={(e) => setForm({ ...form, discord_link: e.target.value })}
                  placeholder="https://discord.gg/..."
                  className="mt-2"
                />
              </div>
            </div>
          )}

          {/* Step 5: Preview */}
          {step === 5 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold">Revise as informações</h3>
                <p className="text-sm text-muted-foreground">Confirme se está tudo certo antes de criar</p>
              </div>

              <Card className="p-4 bg-muted/30">
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <img 
                      src={GAMES.find(g => g.id === form.game)?.logo} 
                      alt="" 
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <h4 className="font-bold text-lg">{form.name || "Sem nome"}</h4>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <Badge variant="secondary">{GAMES.find(g => g.id === form.game)?.name}</Badge>
                        <Badge variant="outline">{form.mode}</Badge>
                        <Badge variant="outline">{form.platform}</Badge>
                        {form.is_private && <Badge variant="destructive">Privado</Badge>}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Data</p>
                      <p className="font-medium">
                        {form.datetime 
                          ? format(new Date(form.datetime), "dd/MM/yyyy", { locale: ptBR })
                          : "-"
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Horário</p>
                      <p className="font-medium">
                        {form.datetime 
                          ? format(new Date(form.datetime), "HH:mm", { locale: ptBR })
                          : "-"
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Vagas</p>
                      <p className="font-medium">{form.max_slots} equipes</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Rodadas</p>
                      <p className="font-medium">{form.rounds}</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Pts/Abate</p>
                      <p className="font-medium text-primary">{form.points_per_kill} pt(s)</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Regras</p>
                      <p className="font-medium">{form.rules ? `${form.rules.split('\n').length} regras` : "Nenhuma"}</p>
                    </div>
                  </div>

                  {form.prize && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-muted-foreground text-sm mb-1">Premiação</p>
                        <p className="text-sm whitespace-pre-wrap">{form.prize}</p>
                      </div>
                    </>
                  )}
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-border flex justify-between">
          <Button
            variant="ghost"
            onClick={step === 1 ? () => setOpen(false) : handleBack}
            disabled={saving}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {step === 1 ? "Cancelar" : "Voltar"}
          </Button>

          {step < STEPS.length ? (
            <Button onClick={handleNext} className="bg-primary">
              Próximo
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleCreate} disabled={saving} className="bg-gradient-primary">
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Criando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Criar Treino
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TrainingWizard;
