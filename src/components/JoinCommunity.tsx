import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const JoinCommunity = () => {
  const navigate = useNavigate();

  return (
    <section className="py-16 px-4">
      <div className="container mx-auto">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card/30">
          {/* Background */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent" />
            <div className="absolute -top-24 left-1/2 h-72 w-[44rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute -bottom-24 right-[-6rem] h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
          </div>

          <div className="relative z-10 py-16 px-6 sm:px-10 text-center">
            <h2 className="text-3xl md:text-5xl font-black mb-4 tracking-tight uppercase">
              Junte-se à Comunidade
            </h2>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              Crie sua conta, monte seu time e participe das melhores scrims competitivas — com calendário
              claro, slots organizados e experiência premium.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg font-semibold uppercase"
                onClick={() => navigate("/auth")}
              >
                Criar Conta
              </Button>
              <Button 
                variant="outline"
                className="border-border text-foreground hover:bg-background/40 px-8 py-6 text-lg font-semibold uppercase"
                onClick={() => navigate("/scrims")}
              >
                Ver Scrims
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default JoinCommunity;
