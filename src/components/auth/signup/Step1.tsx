import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";

interface SignupStep1Props {
    formData: any;
    setFormData: any;
    showPassword: boolean;
    setShowPassword: any;
}

export function SignupStep1({
    formData,
    setFormData,
    showPassword,
    setShowPassword,
}: SignupStep1Props) {
    return (
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
                        type={showPassword ? "text" : "password"}
                        placeholder="Sua senha"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
        </>
    );
}
