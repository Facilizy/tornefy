import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ForgotPasswordFormProps {
    formData: any;
    setFormData: any;
    loading: boolean;
    onSubmit: (e: React.FormEvent) => Promise<void>;
}

export function ForgotPasswordForm({
    formData,
    setFormData,
    loading,
    onSubmit,
}: ForgotPasswordFormProps) {
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

            <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 transition-colors"
                disabled={loading}
            >
                {loading ? "Processando..." : "Enviar E-mail de Recuperação"}
            </Button>
        </form>
    );
}
