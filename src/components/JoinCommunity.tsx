import { Button } from "@/components/ui/button";

const JoinCommunity = () => {
  return (
    <section className="py-16 px-4">
      <div className="container mx-auto">
        <div className="relative rounded-2xl overflow-hidden bg-card border border-border">
          {/* Background subtle effect */}
          <div className="absolute inset-0 bg-primary/5" />
          
          <div className="relative z-10 py-16 px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-wide uppercase">
              Junte-se à Comunidade
            </h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Crie sua conta, monte seu time e participe das melhores scrims competitivas.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg font-semibold uppercase"
                onClick={() => window.location.href = '/auth'}
              >
                Criar Conta
              </Button>
              <Button 
                variant="outline"
                className="border-primary/50 text-primary hover:bg-primary/10 px-8 py-6 text-lg font-semibold uppercase"
                onClick={() => window.location.href = '/scrims'}
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
