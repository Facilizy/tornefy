import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";

interface LoginFormProps {
    formData: any;
    setFormData: any;
    showPassword: boolean;
    setShowPassword: any;
    loading: boolean;
    handleOAuthLogin: (provider: "google" | "discord") => Promise<void>;
    onSubmit: (e: React.FormEvent) => Promise<void>;
}

export function LoginForm({
    formData,
    setFormData,
    showPassword,
    setShowPassword,
    loading,
    handleOAuthLogin,
    onSubmit,
}: LoginFormProps) {
    return (
        <form onSubmit={onSubmit} className="space-y-4">
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

            <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                    <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
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
                        onClick={() => setShowPassword((v: boolean) => !v)}
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                        aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                        {showPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                    </Button>
                </div>
            </div>

            <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 transition-colors"
                disabled={loading}
            >
                {loading ? "Processando..." : "Entrar"}
            </Button>

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
        </form>
    );
}

const DiscordMark = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
);

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
