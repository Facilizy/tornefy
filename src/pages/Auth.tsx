import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) throw error;
        toast.success("Login realizado com sucesso!");
        navigate("/");
      } else {
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
            {isLogin ? "Entrar" : "Criar Conta"}
          </h2>

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
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

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Sua senha"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
                className="bg-background/50 border-border"
              />
            </div>

            {!isLogin && (
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

            <Button
              type="submit"
              className="w-full bg-gradient-primary transition-all duration-300"
              disabled={loading}
            >
              {loading ? "Processando..." : isLogin ? "Entrar" : "Criar Conta"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-primary hover:text-primary-glow transition-colors"
            >
              {isLogin
                ? "Não tem conta? Criar conta"
                : "Já tem conta? Fazer login"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
