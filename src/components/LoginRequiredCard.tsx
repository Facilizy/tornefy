import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface LoginRequiredCardProps {
  title?: string;
  message?: string;
  primaryColor?: string;
}

export function LoginRequiredCard({
  title = "Login necessário",
  message = "Faça login para visualizar este conteúdo.",
  primaryColor,
}: LoginRequiredCardProps) {
  const navigate = useNavigate();

  return (
    <Card className="p-8 bg-card/80 border-border">
      <div className="flex flex-col items-center justify-center text-center space-y-4">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ backgroundColor: primaryColor ? `${primaryColor}20` : "hsl(var(--primary) / 0.1)" }}
        >
          <LogIn
            className="w-8 h-8"
            style={{ color: primaryColor || "hsl(var(--primary))" }}
          />
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-1">{title}</h3>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
        <Button
          onClick={() => navigate("/auth")}
          style={primaryColor ? { backgroundColor: primaryColor } : undefined}
        >
          <LogIn className="w-4 h-4 mr-2" />
          Fazer login
        </Button>
      </div>
    </Card>
  );
}
