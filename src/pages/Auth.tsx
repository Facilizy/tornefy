import { useMemo, useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { LanguageSelector } from "@/components/LanguageSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Eye, EyeOff, Mail } from "lucide-react";

const GAMES = [
  { id: "free_fire", name: "Free Fire", logo: "/game-logos/free-fire.png" },
  { id: "blood_strike", name: "Blood Strike", logo: "/game-logos/blood-strike.png" },
  { id: "farlight_84", name: "Farlight 84", logo: "/game-logos/farlight-84.png" },
  { id: "prime_rush", name: "Prime Rush", logo: "/game-logos/prime-rush.png" },
  { id: "battlefield_6", name: "Battlefield 6", logo: "/game-logos/battlefield-6.png" },
];

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isOAuthCompletion = new URLSearchParams(location.search).get("complete") === "1";

  // Se já estiver logado, não deve acessar /auth (login/cadastro)
  useEffect(() => {
    if (isOAuthCompletion) return;

    let mounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) navigate("/", { replace: true });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (session?.user) navigate("/", { replace: true });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, isOAuthCompletion]);

  const consumePostAuthAction = () => {
    try {
      const raw = localStorage.getItem("post_auth_action");
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      localStorage.removeItem("post_auth_action");

      if (parsed?.type === "training_register" && parsed?.trainingId) {
        navigate(`/training/${parsed.trainingId}`, { replace: true });
        return true;
      }

      return false;
    } catch {
      return false;
    }
  };

  const getAuthModeFromUrl = () => {
    const mode = new URLSearchParams(location.search).get("mode");
    return mode === "signup" ? "signup" : "login";
  };

  const [isLogin, setIsLogin] = useState(getAuthModeFromUrl() !== "signup");
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
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  const [signupAwaitingEmail, setSignupAwaitingEmail] = useState(false);
  const signupEmail = useMemo(() => formData.email.trim(), [formData.email]);

  // Valid organizer invite codes
  const VALID_ORGANIZER_CODES = ["TORNEFYPREMIUM"];

  const setAuthMode = (mode: "login" | "signup") => {
    if (isOAuthCompletion) return;
    const params = new URLSearchParams(location.search);
    params.delete("complete");
    params.set("mode", mode);
    navigate(`/auth?${params.toString()}`, { replace: true });
    setForgotPassword(false);
    setIsLogin(mode === "login");
  };

  useEffect(() => {
    if (isOAuthCompletion) return;
    setIsLogin(getAuthModeFromUrl() !== "signup");
  }, [location.search, isOAuthCompletion]);

  // Reset state when switching between login/signup or forgot password
  useEffect(() => {
    setAcceptedTerms(false);
    setCurrentStep(1);
    setSignupAwaitingEmail(false);
    setShowLoginPassword(false);
    setShowSignupPassword(false);
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
        if (!consumePostAuthAction()) navigate("/");
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
    if (!/[!@#$%^&*(),.?\":{}|<>]/.test(password)) {
      toast.error("A senha deve conter pelo menos um caractere especial");
      return false;
    }
    return true;
  };

  const setPreferredGames = (games: string[]) => {
    setFormData((prev) => ({ ...prev, preferredGames: games }));
  };

  const goToNextStep = () => {
    if (currentStep === 1) {
      if (!formData.email.trim()) {
        toast.error("Informe seu e-mail");
        return;
      }
      if (!formData.password) {
        toast.error("Informe sua senha");
        return;
      }
      setCurrentStep(2);
      return;
    }

    if (currentStep === 2) {
      if (!formData.username || formData.username.trim().length < 3) {
        toast.error("Defina um username com pelo menos 3 caracteres");
        return;
      }

      if (formData.role === "organizer") {
        const code = formData.inviteCode.trim();
        if (!code) {
          toast.error("Informe o código de indicação");
          return;
        }
        if (code.toLowerCase() !== "tornefypremium") {
          toast.error("Código de indicação inválido");
          return;
        }
      }

      setCurrentStep(3);
    }
  };

  const goToPrevStep = () => {
    setCurrentStep((prev) => (prev === 1 ? 1 : (prev - 1) as 1 | 2 | 3));
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
        if (!consumePostAuthAction()) navigate("/");
      } else {
        // OAuth completion flow: user already exists (signed in via provider)
        // Only complete the profile (username, role, games, terms).
        if (isOAuthCompletion) {
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (!session?.user) {
            toast.error("Sessão inválida. Faça login novamente.");
            navigate("/auth?mode=login", { replace: true });
            return;
          }

          // Validar termos
          if (!acceptedTerms) {
            toast.error("Você precisa aceitar os termos e diretrizes da plataforma");
            return;
          }

          // Validar username
          const desiredUsername = (formData.username || "").trim();
          if (!desiredUsername || desiredUsername.length < 3) {
            toast.error("Defina um username com pelo menos 3 caracteres");
            return;
          }

          // Validar username único
          // (permite salvar se o username já for do próprio usuário)
          const { data: usernameOwner, error: usernameLookupError } = await supabase
            .from("profiles")
            .select("id")
            .eq("username", desiredUsername)
            .maybeSingle();

          if (usernameLookupError) throw usernameLookupError;

          if (usernameOwner?.id && usernameOwner.id !== session.user.id) {
            toast.error("Este username já está em uso. Tente outro.");
            return;
          }

          // Validar jogos preferidos
          if (!formData.preferredGames || formData.preferredGames.length === 0) {
            toast.error("Selecione pelo menos um jogo preferido");
            return;
          }

          // Validar código de organizador
          if (formData.role === "organizer") {
            const code = formData.inviteCode.trim();
            if (!code || code.toLowerCase() !== "tornefypremium") {
              toast.error("Código de indicação inválido para criar conta de organizador");
              return;
            }
          }

          const uid = session.user.id;

          const { error: upsertError } = await supabase
            .from("profiles")
            .upsert(
              {
                id: uid,
                full_name: formData.fullName || null,
                username: desiredUsername,
                role: formData.role,
                preferred_games: formData.preferredGames,
              } as any,
              { onConflict: "id" }
            );

          if (upsertError) throw upsertError;

          // Ensure role row exists (best-effort)
          try {
            await (supabase as any)
              .from("user_roles")
              .upsert(
                { user_id: uid, role: formData.role, assigned_at: new Date().toISOString() },
                { onConflict: "user_id" }
              );
          } catch {
            // ignore
          }

          toast.success("Perfil completo! Bem-vindo(a).");
          if (!consumePostAuthAction()) navigate("/");
          return;
        }

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
          const code = formData.inviteCode.trim();
          if (!code || code.toLowerCase() !== "tornefypremium") {
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
            emailRedirectTo: `${window.location.origin}/auth?mode=login`,
          },
        });

        if (error) throw error;

        setSignupAwaitingEmail(true);
        toast.success("Conta criada! Verifique seu e-mail para confirmar.");
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
    <MainLayout>
      <div className="relative overflow-hidden">
        {/* Background effect */}
        <div className="pointer-events-none absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute bottom-20 right-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />

        <div className="container mx-auto px-4 py-28 sm:py-36 md:py-44 relative z-10">
          <div className="flex justify-center">
            <div className="w-full max-w-md">
              <div className="bg-card/50 border border-border rounded-2xl p-6 sm:p-8">
                <div className="mb-4 flex justify-end">
                  <LanguageSelector />
                </div>
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
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                              type={showLoginPassword ? "text" : "password"}
                              placeholder="Sua senha"
                              value={formData.password}
                              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                              required
                              className="bg-background/50 border-border pr-10"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => setShowLoginPassword((v) => !v)}
                              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                              aria-label={showLoginPassword ? "Ocultar senha" : "Mostrar senha"}
                            >
                              {showLoginPassword ? (
                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <Eye className="h-4 w-4 text-muted-foreground" />
                              )}
                            </Button>
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

                          <Button
                            type="button"
                            variant="outline"
                            className="w-full justify-center gap-3 bg-background/40"
                            onClick={() => handleOAuthLogin("google")}
                            disabled={loading}
                          >
                            <GoogleMark className="w-5 h-5" />
                            <span>Entrar com Google</span>
                          </Button>
                        </div>
                      )}
                    </>
                  )}

                  {/* Fluxo de CRIAR CONTA (wizard 3 passos) */}
                  {!isLogin && !forgotPassword && (
                    <>
                      {/* Cadastro */}
                      {signupAwaitingEmail ? (
                        <div className="space-y-6 py-6 text-center">
                          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-border">
                            <Mail className="h-6 w-6 text-primary" />
                          </div>
                          <div className="space-y-2">
                            <h3 className="text-lg font-semibold">Verifique seu e-mail</h3>
                            <p className="text-sm text-muted-foreground">
                              Enviamos um link de confirmação para <span className="font-medium text-foreground">{signupEmail || "seu e-mail"}</span>.
                            </p>
                          </div>
                          <Button type="button" className="w-full" onClick={() => setAuthMode("login")}
                          >
                            Fazer login
                          </Button>
                        </div>
                      ) : (
                        <>
                          {/* HUD do Wizard (somente barra + 'Cadastro · Passo X/3') */}
                          <div className="space-y-3 mb-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Cadastro · Passo {currentStep}/3
                            </p>
                            <Progress
                              value={(currentStep / 3) * 100}
                              className="h-2 bg-muted overflow-hidden"
                              aria-label="Progresso do cadastro"
                            />
                          </div>
                        </>
                      )}

                      {!signupAwaitingEmail && (
                        <>
                          {/* Conteúdo do passo */}
                          <div key={currentStep} className="animate-fade-in">
                            {/* STEP 1 */}
                            {currentStep === 1 && (
                              <>
                                <div className="space-y-2">
                                  <Label htmlFor="fullName">Nome Completo</Label>
                                  <Input
                                    id="fullName"
                                    type="text"
                                    placeholder="Seu nome"
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
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
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="bg-background/50 border-border"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="password">Senha</Label>
                                  <div className="relative">
                                    <Input
                                      id="password"
                                      type={showSignupPassword ? "text" : "password"}
                                      placeholder="Sua senha"
                                      value={formData.password}
                                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                      className="bg-background/50 border-border pr-10"
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setShowSignupPassword((v) => !v)}
                                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                                      aria-label={showSignupPassword ? "Ocultar senha" : "Mostrar senha"}
                                    >
                                      {showSignupPassword ? (
                                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                                      ) : (
                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              </>
                            )}

                            {/* STEP 2 */}
                            {currentStep === 2 && (
                              <div className="space-y-4 pt-2">
                                <div className="space-y-2">
                                  <Label htmlFor="username">Username</Label>
                                  <Input
                                    id="username"
                                    type="text"
                                    placeholder="seu_username"
                                    value={formData.username}
                                    onChange={(e) =>
                                      setFormData({
                                        ...formData,
                                        username: e.target.value.toLowerCase().replace(/\s/g, ""),
                                      })
                                    }
                                    className="bg-background/50 border-border"
                                  />
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
                                  </div>
                                )}
                              </div>
                            )}

                            {/* STEP 3 */}
                            {currentStep === 3 && (
                              <div className="space-y-5 pt-2">
                                <div className="space-y-3">
                                  <Label>Jogos favoritos</Label>
                                  <ToggleGroup
                                    type="multiple"
                                    value={formData.preferredGames}
                                    onValueChange={(value) => setPreferredGames(value)}
                                    className="grid grid-cols-1 gap-3"
                                  >
                                    {GAMES.map((game) => (
                                      <ToggleGroupItem
                                        key={game.id}
                                        value={game.id}
                                        aria-label={game.name}
                                        className="w-full justify-start gap-3 px-3 py-3 h-auto rounded-lg border border-border bg-background/30 data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                                      >
                                        <img
                                          src={game.logo}
                                          alt={game.name}
                                          loading="lazy"
                                          className="w-8 h-8 rounded object-cover"
                                        />
                                        <span className="flex-1 font-medium text-left">{game.name}</span>
                                      </ToggleGroupItem>
                                    ))}
                                  </ToggleGroup>
                                </div>

                                <div className="flex items-start gap-3 rounded-lg border border-border bg-background/30 p-3">
                                  <Checkbox
                                    id="terms"
                                    checked={acceptedTerms}
                                    onCheckedChange={(v) => setAcceptedTerms(Boolean(v))}
                                    className="mt-1"
                                  />
                                  <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                                    Aceito os{" "}
                                    <Link to="/terms" className="underline underline-offset-2 hover:text-foreground">
                                      Termos de Uso
                                    </Link>
                                    {" "}e a{" "}
                                    <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground">
                                      Política de Privacidade
                                    </Link>
                                  </Label>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Navegação do wizard */}
                          <div className="mt-6 flex items-center gap-3">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={goToPrevStep}
                              disabled={currentStep === 1 || loading}
                              className="flex-1"
                            >
                              <ArrowLeft className="h-4 w-4 mr-2" />
                              Voltar
                            </Button>

                            {currentStep < 3 ? (
                              <Button
                                type="button"
                                onClick={goToNextStep}
                                disabled={loading}
                                className="flex-1"
                              >
                                Prosseguir
                              </Button>
                            ) : (
                              <Button
                                type="submit"
                                disabled={loading}
                                className="flex-1 bg-primary hover:bg-primary/90"
                              >
                                {loading ? "Criando..." : "Criar conta"}
                              </Button>
                            )}
                          </div>
                        </>
                      )}
                    </>
                  )}
                </form>

                <div className="mt-6 space-y-3 text-center">
                  {isLogin && !forgotPassword && (
                    <button
                      type="button"
                      onClick={() => setForgotPassword(true)}
                      className="text-sm text-primary hover:text-primary/80 transition-colors block w-full"
                    >
                      Esqueci minha senha
                    </button>
                  )}

                  {!forgotPassword && (
                    <button
                      type="button"
                      onClick={() => setAuthMode(isLogin ? "signup" : "login")}
                      className="text-sm text-primary hover:text-primary/80 transition-colors block w-full"
                    >
                      {isLogin ? "Não tem conta? Criar conta" : "Já tem conta? Fazer login"}
                    </button>
                  )}

                  {forgotPassword && (
                    <button
                      type="button"
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
        </div>
      </div>
    </MainLayout>
  );
};

const GoogleMark = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path
      fill="currentColor"
      d="M21.35 11.1H12v3.8h5.34c-.23 1.25-.95 2.3-2.05 3.02v2.5h3.32c1.95-1.8 3.07-4.45 3.07-7.57 0-.7-.06-1.38-.33-2.75z"
    />
    <path
      fill="currentColor"
      d="M12 22c2.79 0 5.12-.92 6.83-2.5l-3.32-2.5c-.92.62-2.1.98-3.51.98-2.7 0-4.98-1.82-5.8-4.27H2.78v2.68C4.48 19.98 8.01 22 12 22z"
    />
    <path
      fill="currentColor"
      d="M6.2 13.71A5.99 5.99 0 0 1 5.9 12c0-.6.1-1.18.3-1.71V7.61H2.78A9.98 9.98 0 0 0 2 12c0 1.61.39 3.13.78 4.39l3.42-2.68z"
    />
    <path
      fill="currentColor"
      d="M12 6.02c1.52 0 2.88.52 3.95 1.55l2.96-2.96C17.12 2.91 14.79 2 12 2 8.01 2 4.48 4.02 2.78 7.61l3.42 2.68C7.02 7.84 9.3 6.02 12 6.02z"
    />
  </svg>
);

const DiscordMark = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);

export default Auth;
