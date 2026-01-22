import MainLayout from "@/components/MainLayout";
import { Card } from "@/components/ui/card";
import { Shield, FileText } from "lucide-react";
import { useEffect } from "react";
import { setSeo } from "@/lib/seo";

const Terms = () => {
  useEffect(() => {
    setSeo({
      title: "Termos de Uso • Tornefy",
      description: "Regras e condições para uso da plataforma Tornefy.",
      canonical: window.location.origin + "/terms",
    });
  }, []);

  const updatedAt = "21/01/2026";

  return (
    <MainLayout>
      {/* Purple Header Banner */}
      <div className="relative py-16 mb-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/20 via-primary/5 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        <div className="container mx-auto px-4 relative z-10 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="w-8 h-8 text-primary" />
            <h1 className="text-3xl md:text-5xl font-black uppercase text-primary">
              Termos de Uso
            </h1>
          </div>
          <p className="text-muted-foreground max-w-md mx-auto">
            Regras e condições para uso da plataforma.
          </p>
        </div>
      </div>

      <main className="container mx-auto px-4 pb-16 max-w-4xl">
        <Card className="p-6 md:p-8 bg-card/50 border-border">
          <div className="flex items-center gap-2 mb-6">
            <FileText className="w-5 h-5 text-primary" />
            <h2 className="text-2xl font-bold">Termos de Uso</h2>
          </div>

            <p className="text-sm text-muted-foreground mb-6">
              Última atualização: <span className="font-medium text-foreground">{updatedAt}</span>
            </p>

          <div className="space-y-6 text-muted-foreground">
            <section>
              <h3 className="text-lg font-semibold text-foreground mb-2">1. Aceitação dos Termos</h3>
              <p>
                Ao acessar e usar a plataforma Tornefy, você concorda em cumprir e estar sujeito a estes Termos de Uso.
                Se você não concordar com qualquer parte destes termos, não poderá acessar o serviço.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-foreground mb-2">2. Descrição do Serviço</h3>
              <p>
                A Tornefy é uma plataforma de organização de scrims e treinos competitivos para jogos de esports.
                Oferecemos ferramentas para criação de eventos, gerenciamento de equipes e acompanhamento de estatísticas.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-foreground mb-2">3. Conta de Usuário</h3>
              <p>Para utilizar alguns recursos da plataforma, você precisa criar uma conta. Você é responsável por:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Manter a confidencialidade de suas credenciais de acesso</li>
                <li>Todas as atividades que ocorrem em sua conta</li>
                <li>Notificar-nos imediatamente sobre qualquer uso não autorizado</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-foreground mb-2">4. Conduta do Usuário</h3>
              <p>Ao usar nossa plataforma, você concorda em não:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Violar leis aplicáveis ou regulamentos</li>
                <li>Publicar conteúdo ofensivo, difamatório ou prejudicial</li>
                <li>Usar a plataforma para spam ou atividades fraudulentas</li>
                <li>Tentar acessar contas de outros usuários</li>
                <li>Interferir na operação normal da plataforma</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-foreground mb-2">5. Equipes e Eventos</h3>
              <p>
                Organizadores e capitães de equipes são responsáveis pela conduta de seus membros durante eventos.
                A Tornefy se reserva o direito de suspender ou banir equipes que violem as regras da comunidade.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-foreground mb-2">6. Modificações</h3>
              <p>
                Reservamo-nos o direito de modificar estes termos a qualquer momento. Notificaremos sobre mudanças
                significativas através da plataforma ou por e-mail.
              </p>
            </section>

              <section>
                <h3 className="text-lg font-semibold text-foreground mb-2">7. Privacidade</h3>
                <p>
                  O tratamento de dados pessoais segue nossa Política de Privacidade. Ao utilizar a plataforma, você
                  reconhece que leu e compreendeu as informações sobre coleta e uso de dados.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-foreground mb-2">8. Propriedade Intelectual</h3>
                <p>
                  A marca, identidade visual e funcionalidades da plataforma são protegidas. Você não pode copiar,
                  reproduzir ou distribuir conteúdos e recursos da Tornefy sem autorização.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-foreground mb-2">9. Lei Aplicável</h3>
                <p>
                  Estes termos são regidos pelas leis brasileiras. Eventuais disputas serão tratadas conforme a legislação
                  vigente.
                </p>
              </section>

            <section>
                <h3 className="text-lg font-semibold text-foreground mb-2">10. Contato</h3>
                <p>
                  Para dúvidas sobre estes termos, entre em contato através do nosso Discord oficial, disponível no rodapé
                  do site.
                </p>
            </section>
          </div>
        </Card>
      </main>
    </MainLayout>
  );
};

export default Terms;
