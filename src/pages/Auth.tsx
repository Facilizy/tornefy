import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    role: "player" as "player" | "organizer",
  });
  const [forgotPassword, setForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Reset accepted terms when switching between login/signup
  useEffect(() => {
    setAcceptedTerms(false);
  }, [isLogin, forgotPassword]);

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
        const { error } = await supabase.auth.resetPasswordForEmail(
          formData.email,
          {
            redirectTo: `${window.location.origin}/auth`,
          }
        );

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

        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.fullName,
              role: formData.role,
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-radial opacity-50" />
      
      {/* Floating orbs for visual effect */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary-glow/20 rounded-full blur-3xl animate-pulse" />

      <div className="w-full max-w-md px-6 relative z-10">
        {/* Logo / Title */}
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-5xl font-bold gradient-text mb-2">
            TORNEFY
          </h1>
          <span className="text-sm text-muted-foreground tracking-wider">(BETA)</span>
        </div>

        {/* Auth Form */}
        <div className="backdrop-blur-xl bg-card/50 border border-border rounded-2xl p-8 animate-slide-up">
          <h2 className="text-2xl font-semibold mb-6 text-center">
            {forgotPassword ? "Recuperar Senha" : isLogin ? "Entrar" : "Criar Conta"}
          </h2>

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && !forgotPassword && (
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
                  required
                  className="bg-background/50 border-border"
                />
              </div>
            )}

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

            {!isLogin && !forgotPassword && (
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
            )}

            {!isLogin && !forgotPassword && (
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
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-primary transition-all duration-300"
              disabled={loading}
            >
              {loading 
                ? "Processando..." 
                : forgotPassword 
                ? "Enviar E-mail de Recuperação"
                : isLogin 
                ? "Entrar" 
                : "Criar Conta"}
            </Button>
          </form>

          <div className="mt-6 space-y-3 text-center">
            {isLogin && !forgotPassword && (
              <button
                onClick={() => setForgotPassword(true)}
                className="text-sm text-primary hover:text-primary-glow transition-colors block w-full"
              >
                Esqueci minha senha
              </button>
            )}
            
            {!forgotPassword && (
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-primary hover:text-primary-glow transition-colors block w-full"
              >
                {isLogin
                  ? "Não tem conta? Criar conta"
                  : "Já tem conta? Fazer login"}
              </button>
            )}

            {forgotPassword && (
              <button
                onClick={() => setForgotPassword(false)}
                className="text-sm text-primary hover:text-primary-glow transition-colors block w-full"
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

export default Auth;
