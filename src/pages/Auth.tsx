import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import TornefyLogo from "@/components/TornefyLogo";

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    username: "",
    role: "player" as "player" | "organizer",
    inviteCode: "",
    preferredGames: ["free_fire"] as string[],
  });
  const [forgotPassword, setForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  const isOAuthCompletion = new URLSearchParams(location.search).get("complete") === "1";

  // Valid organizer invite codes
  const VALID_ORGANIZER_CODES = ["TORNEFY2024", "ORGANIZER-VIP", "TORNEFYPREMIUM"];

  // Reset accepted terms and step when switching between login/signup or forgot password
  useEffect(() => {
    setAcceptedTerms(false);
    setCurrentStep(1);
  }, [isLogin, forgotPassword]);

  // OAuth completion: prefill name/avatar and force the wizard flow
  useEffect(() => {
    if (!isOAuthCompletion) return;

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        // not logged in yet -> show normal login screen
        return;
      }

      // If user already has username, completion is not needed
      const { data: profileData } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profileData?.username) {
        navigate("/");
        return;
      }

      const meta: any = session.user.user_metadata || {};
      const fullName = meta.full_name || meta.name || "";
      const avatarUrl = meta.avatar_url || meta.picture || meta.avatar || "";

      setIsLogin(false);
      setForgotPassword(false);
      setCurrentStep(2);
      setFormData((prev) => ({
        ...prev,
        fullName: fullName || prev.fullName,
        username: prev.username,
        role: prev.role || "player",
        preferredGames: prev.preferredGames?.length ? prev.preferredGames : ["free_fire"],
      }));

      // Save avatar into profiles later on submit; we keep it in metadata variable only
      if (avatarUrl) {
        try {
          await supabase
            .from("profiles")
            .update({ avatar_url: avatarUrl })
            .eq("id", session.user.id);
        } catch {
          // ignore
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOAuthCompletion]);

  const validatePassword = (password: string): boolean => {
    if (password.length < 8) {
      toast.error("A senha deve ter no mínimo 8 caracteres");
      return false;
    }
    if (!/[A-Z]/.test(password)) {
      toast.error("A senha deve conter pelo menos uma letra maiúscula");
      return false;
    }
    if (!/[a-z]/.test(password)) {
      toast.error("A senha deve conter pelo menos uma letra minúscula");
      return false;
    }
    if (!/[0-9]/.test(password)) {
      toast.error("A senha deve conter pelo menos um número");
      return false;
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      toast.error("A senha deve conter pelo menos um caractere especial");
      return false;
    }
    return true;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (forgotPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
          redirectTo: `${window.location.origin}/auth`,
        });

        if (error) throw error;
        toast.success("E-mail de recuperação enviado! Verifique sua caixa de entrada.");
        setForgotPassword(false);
      } else if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) throw error;
        toast.success("Login realizado com sucesso!");
        navigate("/");
      } else {
        // Validar senha forte
        if (!validatePassword(formData.password)) {
          setLoading(false);
          return;
        }

        // Validar termos
        if (!acceptedTerms) {
          toast.error("Você precisa aceitar os termos e diretrizes da plataforma");
          setLoading(false);
          return;
        }

        // Validar username
        if (!formData.username || formData.username.trim().length < 3) {
          toast.error("Defina um username com pelo menos 3 caracteres");
          setLoading(false);
          return;
        }

        // Validar jogos preferidos
        if (!formData.preferredGames || formData.preferredGames.length === 0) {
          toast.error("Selecione pelo menos um jogo preferido");
          setLoading(false);
          return;
        }

        // Validar código de organizador
        if (formData.role === "organizer") {
          if (!formData.inviteCode || !VALID_ORGANIZER_CODES.includes(formData.inviteCode.toUpperCase())) {
            toast.error("Código de indicação inválido para criar conta de organizador");
            setLoading(false);
            return;
          }
        }

        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.fullName,
              username: formData.username,
              role: formData.role,
              preferred_games: formData.preferredGames,
            },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (error) throw error;
        toast.success("Conta criada com sucesso! Você já pode fazer login.");
        setIsLogin(true);
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: "google" | "discord") => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          // always return to completion screen; if not needed it redirects to home
          redirectTo: `${window.location.origin}/auth?complete=1`,
        },
      });
      if (error) throw error;

      // Some environments return the URL instead of auto redirecting.
      if (data?.url) {
        window.location.assign(data.url);
      }
    } catch (e: any) {
      toast.error(e?.message || `Erro ao entrar com ${provider}`);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Background effect */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />

      <div className="w-full max-w-md px-6 relative z-10">
        {/* Logo / Title */}
        <div className="text-center mb-8 flex flex-col items-center">
          <TornefyLogo className="h-12 mb-2" />
          <span className="text-sm text-muted-foreground tracking-wider">(BETA)</span>
        </div>

        {/* Auth Form */}
        <div className="bg-card/50 border border-border rounded-2xl p-8">
          <h2 className="text-2xl font-semibold mb-6 text-center">
            {forgotPassword ? "Recuperar Senha" : isLogin ? "Entrar" : "Criar Conta"}
          </h2>

          <form onSubmit={handleAuth} className="space-y-4">
            {/* Fluxo de LOGIN ou RECUPERAR SENHA (sem wizard) */}
            {(isLogin || forgotPassword) && (
              <>
                {/* E-mail */}
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="voce@email.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                    className="bg-background/50 border-border"
                  />
                </div>

                {/* Senha (exceto recuperar senha) */}
                {!forgotPassword && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Sua senha"
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                        required
                        className="bg-background/50 border-border pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 transition-colors"
                  disabled={loading}
                >
                  {loading
                    ? "Processando..."
                    : forgotPassword
                    ? "Enviar E-mail de Recuperação"
                    : "Entrar"}
                </Button>

                {/* Social login (somente no login) - abaixo do botão Entrar */}
                {isLogin && !forgotPassword && !isOAuthCompletion && (
                  <div className="pt-2 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-xs text-muted-foreground">ou</span>
                      <div className="h-px flex-1 bg-border" />
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-center gap-3 bg-background/40"
                      onClick={() => handleOAuthLogin("discord")}
                      disabled={loading}
                    >
                      <DiscordMark className="w-5 h-5" />
                      <span>Entrar com Discord</span>
                    </Button>
                  </div>
                )}
              </>
            )}

            {/* Fluxo de CRIAR CONTA (wizard 3 passos) */}
            {!isLogin && !forgotPassword && (
              <>
                {/* HUD do Wizard (progresso + passos) */}
                <div className="space-y-3 mb-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Cadastro · Passo {currentStep}/3
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {currentStep === 1
                        ? "Setup inicial"
                        : currentStep === 2
                        ? "Identidade"
                        : "Confirmação"}
                    </p>
                  </div>

                  <Progress
                    value={(currentStep / 3) * 100}
                    className="h-2 bg-muted overflow-hidden"
                    aria-label="Progresso do cadastro"
                  />

                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[1, 2, 3].map((step) => {
                      const isActive = currentStep === step;
                      const isDone = currentStep > step;
                      return (
                        <div
                          key={step}
                          className={`rounded-lg border px-2 py-2 text-[11px] leading-tight transition-colors ${
                            isActive
                              ? "border-primary bg-primary/10"
                              : isDone
                              ? "border-border bg-muted/30"
                              : "border-border bg-card/30"
                          }`}
                        >
                          <div className="font-semibold">
                            {step === 1 ? "Dados" : step === 2 ? "@User" : "Revisar"}
                          </div>
                          <div className="text-muted-foreground">
                            {step === 1
                              ? "Conta"
                              : step === 2
                              ? "Perfil"
                              : "Enviar"}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Dica: preencha com calma — você só cria a conta no final, após revisar a prévia.
                  </p>
                </div>

                {/* Conteúdo do passo (animado) */}
                <div key={currentStep} className="animate-fade-in">
                  {/* STEP 1 - DADOS BÁSICOS */}
                {currentStep === 1 && (
                  <>
                    <div className="space-y-1 pt-1">
                      <p className="text-[11px] font-semibold uppercase text-primary tracking-wide">
                        Parte 1 · Dados básicos
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Comece com seu nome completo e credenciais de acesso.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fullName">Nome Completo</Label>
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="Seu nome"
                        value={formData.fullName}
                        onChange={(e) =>
                          setFormData({ ...formData, fullName: e.target.value })
                        }
                        className="bg-background/50 border-border"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="voce@email.com"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        className="bg-background/50 border-border"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Senha</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Sua senha"
                          value={formData.password}
                          onChange={(e) =>
                            setFormData({ ...formData, password: e.target.value })
                          }
                          className="bg-background/50 border-border pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Use uma senha forte com pelo menos 8 caracteres, letras maiúsculas,
                        minúsculas, números e símbolo.
                      </p>
                    </div>
                  </>
                )}

                {/* STEP 2 - USERNAME E TIPO DE CONTA */}
                {currentStep === 2 && (
                  <div className="space-y-4 pt-2">
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold uppercase text-primary tracking-wide">
                        Parte 2 · Username e tipo de conta
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Escolha um @username único (como será visto nas scrims) e defina se
                        você é jogador ou organizador.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        type="text"
                        placeholder="seu_username"
                        value={formData.username}
                        onChange={(e) =>
                          setFormData({ ...formData, username: e.target.value })
                        }
                        className="bg-background/50 border-border"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Use apenas letras, números e underline. Esse será seu @fixo na
                        plataforma e poderá aparecer em rankings e estatísticas.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <Label>Tipo de Conta</Label>
                      <RadioGroup
                        value={formData.role}
                        onValueChange={(value: "player" | "organizer") =>
                          setFormData({ ...formData, role: value })
                        }
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="player" id="player" />
                          <Label htmlFor="player" className="cursor-pointer">
                            Jogador
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="organizer" id="organizer" />
                          <Label htmlFor="organizer" className="cursor-pointer">
                            Organizador
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {formData.role === "organizer" && (
                      <div className="space-y-2">
                        <Label htmlFor="inviteCode">Código de Indicação</Label>
                        <Input
                          id="inviteCode"
                          type="text"
                          placeholder="Digite o código de indicação"
                          value={formData.inviteCode}
                          onChange={(e) =>
                            setFormData({ ...formData, inviteCode: e.target.value })
                          }
                          className="bg-background/50 border-border"
                        />
                        <p className="text-xs text-muted-foreground">
                          Conta de organizador requer código válido
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 3 - TERMOS, JOGOS PREFERIDOS E PRÉVIA */}
                {currentStep === 3 && (
                  <>
                    <div className="space-y-1 pt-4">
                      <p className="text-[11px] font-semibold uppercase text-primary tracking-wide">
                        Parte 3 · Termos e jogos preferidos
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Confirme que está de acordo com as regras, escolha seus jogos e revise
                        a prévia do seu perfil antes de criar a conta.
                      </p>
                    </div>

                    <div className="flex items-start space-x-2 pt-2">
                      <Checkbox
                        id="terms"
                        checked={acceptedTerms}
                        onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                        className="mt-0.5"
                      />
                      <Label
                        htmlFor="terms"
                        className="text-sm text-muted-foreground cursor-pointer leading-tight"
                      >
                        Ao criar uma conta, você concorda com os termos e diretrizes da plataforma
                      </Label>
                    </div>

                    <div className="pt-4">
                      <Label className="block mb-2 text-sm font-medium">Jogos Preferidos</Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Escolha pelo menos um jogo que você joga para personalizar suas recomendações.
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: "free_fire", name: "Free Fire" },
                          { id: "blood_strike", name: "Blood Strike" },
                          { id: "farlight_84", name: "Farlight 84" },
                          { id: "prime_rush", name: "Prime Rush" },
                          { id: "battlefield_6", name: "Battlefield 6" },
                        ].map((game) => {
                          const selected = formData.preferredGames.includes(game.id);
                          return (
                            <div
                              key={game.id}
                              role="button"
                              aria-pressed={selected}
                              tabIndex={0}
                              onClick={() => {
                                setFormData((prev) => {
                                  const current = prev.preferredGames;
                                  const exists = current.includes(game.id);
                                  return {
                                    ...prev,
                                    preferredGames: exists
                                      ? current.filter((g) => g !== game.id)
                                      : [...current, game.id],
                                  };
                                });
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  setFormData((prev) => {
                                    const current = prev.preferredGames;
                                    const exists = current.includes(game.id);
                                    return {
                                      ...prev,
                                      preferredGames: exists
                                        ? current.filter((g) => g !== game.id)
                                        : [...current, game.id],
                                    };
                                  });
                                }
                              }}
                              className={`text-left text-xs px-3 py-2 rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background cursor-pointer ${
                                selected
                                  ? "border-primary bg-primary/10"
                                  : "border-border hover:border-primary/50"
                              }`}
                            >
                              <Checkbox
                                checked={selected}
                                className="mr-2 align-middle pointer-events-none"
                                tabIndex={-1}
                                aria-hidden="true"
                              />
                              <span className="align-middle">{game.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Prévia do perfil */}
                    <div className="mt-6 rounded-lg border border-border bg-card/60 p-4 text-sm space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Prévia do seu perfil
                      </p>
                      <div className="space-y-1">
                        <p>
                          <span className="font-medium">Nome:</span> {formData.fullName || "—"}
                        </p>
                        <p>
                          <span className="font-medium">Username:</span> @{formData.username || "seu_username"}
                        </p>
                        <p>
                          <span className="font-medium">Tipo de conta:</span>{" "}
                          {formData.role === "organizer" ? "Organizador" : "Jogador"}
                        </p>
                        <p>
                          <span className="font-medium">Jogos:</span>{" "}
                          {formData.preferredGames.length > 0
                            ? formData.preferredGames
                                .map((id) => {
                                  const game = [
                                    { id: "free_fire", name: "Free Fire" },
                                    { id: "blood_strike", name: "Blood Strike" },
                                    { id: "farlight_84", name: "Farlight 84" },
                                    { id: "prime_rush", name: "Prime Rush" },
                                    { id: "battlefield_6", name: "Battlefield 6" },
                                  ].find((g) => g.id === id);
                                  return game?.name ?? id;
                                })
                                .join(", ")
                            : "Nenhum jogo selecionado"}
                        </p>
                      </div>
                    </div>
                  </>
                )}
                </div>

                {/* Navegação do wizard */}
                <div className="mt-6 flex items-center justify-between gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    disabled={currentStep === 1 || loading}
                    onClick={() => setCurrentStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3) : prev))}
                  >
                    Voltar
                  </Button>

                  <Button
                    type={currentStep === 3 ? "submit" : "button"}
                    className="flex-1 bg-primary hover:bg-primary/90 transition-colors"
                    disabled={loading}
                    onClick={async () => {
                      if (currentStep === 1) {
                        // Validação básica da etapa 1
                        if (!formData.fullName.trim()) {
                          toast.error("Informe seu nome completo");
                          return;
                        }
                        if (!formData.email.trim()) {
                          toast.error("Informe um e-mail válido");
                          return;
                        }
                        if (!formData.password.trim()) {
                          toast.error("Defina uma senha");
                          return;
                        }
                        setCurrentStep(2);
                      } else if (currentStep === 2) {
                        // Validação da etapa 2
                        if (!formData.username || formData.username.trim().length < 3) {
                          toast.error("Defina um username com pelo menos 3 caracteres");
                          return;
                        }
                        if (formData.role === "organizer") {
                          if (
                            !formData.inviteCode ||
                            !VALID_ORGANIZER_CODES.includes(formData.inviteCode.toUpperCase())
                          ) {
                            toast.error("Código de indicação inválido para conta de organizador");
                            return;
                          }
                        }
                        setCurrentStep(3);
                      }
                      // currentStep === 3 deixa o submit seguir normalmente para handleAuth
                    }}
                  >
                    {currentStep === 3
                      ? loading
                        ? "Criando conta..."
                        : "Confirmar e criar conta"
                      : "Próximo"}
                  </Button>
                </div>
              </>
            )}
          </form>

          <div className="mt-6 space-y-3 text-center">
            {isLogin && !forgotPassword && (
              <button
                onClick={() => setForgotPassword(true)}
                className="text-sm text-primary hover:text-primary/80 transition-colors block w-full"
              >
                Esqueci minha senha
              </button>
            )}
            
            {!forgotPassword && (
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-primary hover:text-primary/80 transition-colors block w-full"
              >
                {isLogin
                  ? "Não tem conta? Criar conta"
                  : "Já tem conta? Fazer login"}
              </button>
            )}

            {forgotPassword && (
              <button
                onClick={() => setForgotPassword(false)}
                className="text-sm text-primary hover:text-primary/80 transition-colors block w-full"
              >
                Voltar ao login
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const DiscordMark = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);

export default Auth;
