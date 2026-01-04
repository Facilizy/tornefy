import { UserPlus, Gamepad2, TrendingUp, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const HowItWorks = () => {
  const navigate = useNavigate();

  const steps = [
    {
      number: "01",
      title: "CRIE SUA CONTA",
      description: "Registre-se gratuitamente e configure seu perfil com suas informações de jogador.",
      icon: UserPlus,
      color: "text-destructive border-destructive/50"
    },
    {
      number: "02",
      title: "ESCOLHA SUA MODALIDADE",
      description: "Scrims competitivas, treinos Squad, Duo ou Solo. Entre para uma organização.",
      icon: Gamepad2,
      color: "text-primary border-primary/50"
    },
    {
      number: "03",
      title: "JOGUE E EVOLUA",
      description: "Suba no ranking, ganhe experiência e conquiste seu lugar entre os melhores.",
      icon: TrendingUp,
      color: "text-green-500 border-green-500/50"
    }
  ];

  return (
    <div className="w-full py-16 px-4 bg-background/50">
      <div className="container mx-auto">
        {/* Title */}
        <h2 className="text-3xl md:text-4xl font-black text-center mb-2 tracking-tight">
          COMO <span className="text-destructive">FUNCIONA</span>
        </h2>
        <p className="text-center text-muted-foreground mb-12">
          Comece sua jornada competitiva em poucos passos
        </p>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`relative p-6 rounded-xl border ${step.color} bg-card/30 backdrop-blur-sm`}
            >
              <div className="flex items-start justify-between mb-4">
                <span className={`text-3xl font-black ${step.color.split(" ")[0]}`}>
                  {step.number}
                </span>
                <div className={`p-3 rounded-lg bg-background/50 ${step.color.split(" ")[0]}`}>
                  <step.icon className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-lg font-bold mb-2 tracking-wide">
                {step.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex flex-col items-center gap-3">
          <Button 
            size="lg"
            className="bg-destructive hover:bg-destructive/90 text-white px-8"
            onClick={() => navigate("/auth")}
          >
            COMEÇAR AGORA
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <span className="text-sm text-muted-foreground">100% gratuito</span>
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;