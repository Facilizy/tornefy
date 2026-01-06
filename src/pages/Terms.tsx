import MainLayout from "@/components/MainLayout";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, FileText, Lock } from "lucide-react";

const Terms = () => {
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
              Termos e Privacidade
            </h1>
          </div>
          <p className="text-muted-foreground max-w-md mx-auto">
            Informações sobre os termos de uso e política de privacidade
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-16 max-w-4xl">
        <Tabs defaultValue="terms" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="terms" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Termos de Uso
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Privacidade
            </TabsTrigger>
          </TabsList>

          <TabsContent value="terms">
            <Card className="p-6 md:p-8 bg-card/50 border-border">
              <h2 className="text-2xl font-bold mb-6">Termos de Uso</h2>
              
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
                  <p>
                    Para utilizar alguns recursos da plataforma, você precisa criar uma conta. Você é responsável por:
                  </p>
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
                    Reservamo-nos o direito de modificar estes termos a qualquer momento. 
                    Notificaremos sobre mudanças significativas através da plataforma ou por e-mail.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-foreground mb-2">7. Contato</h3>
                  <p>
                    Para dúvidas sobre estes termos, entre em contato através do nosso Discord oficial.
                  </p>
                </section>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="privacy">
            <Card className="p-6 md:p-8 bg-card/50 border-border">
              <h2 className="text-2xl font-bold mb-6">Política de Privacidade</h2>
              
              <div className="space-y-6 text-muted-foreground">
                <section>
                  <h3 className="text-lg font-semibold text-foreground mb-2">1. Informações que Coletamos</h3>
                  <p>Coletamos as seguintes informações:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Informações de conta (e-mail, nome de usuário)</li>
                    <li>Informações de perfil (avatar, banner, bio)</li>
                    <li>Dados de equipe e participação em eventos</li>
                    <li>Estatísticas de jogos (quando disponíveis)</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-foreground mb-2">2. Como Usamos suas Informações</h3>
                  <p>Utilizamos suas informações para:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Fornecer e melhorar nossos serviços</li>
                    <li>Personalizar sua experiência na plataforma</li>
                    <li>Comunicar sobre eventos e atualizações</li>
                    <li>Manter a segurança da plataforma</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-foreground mb-2">3. Compartilhamento de Dados</h3>
                  <p>
                    Não vendemos suas informações pessoais. Podemos compartilhar dados com:
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Provedores de serviços que nos auxiliam na operação</li>
                    <li>Outros usuários (informações públicas do perfil)</li>
                    <li>Autoridades legais quando exigido por lei</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-foreground mb-2">4. Segurança dos Dados</h3>
                  <p>
                    Implementamos medidas de segurança para proteger suas informações, incluindo:
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Criptografia de dados em trânsito e em repouso</li>
                    <li>Controles de acesso rigorosos</li>
                    <li>Monitoramento contínuo de segurança</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-foreground mb-2">5. Seus Direitos</h3>
                  <p>Você tem o direito de:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Acessar suas informações pessoais</li>
                    <li>Corrigir dados incorretos</li>
                    <li>Solicitar exclusão de sua conta</li>
                    <li>Exportar seus dados</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-foreground mb-2">6. Cookies</h3>
                  <p>
                    Utilizamos cookies para melhorar sua experiência, manter sua sessão ativa e analisar 
                    o uso da plataforma. Você pode controlar cookies através das configurações do navegador.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-foreground mb-2">7. Alterações nesta Política</h3>
                  <p>
                    Podemos atualizar esta política periodicamente. Notificaremos sobre mudanças 
                    significativas através da plataforma.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-foreground mb-2">8. Contato</h3>
                  <p>
                    Para questões sobre privacidade, entre em contato através do nosso Discord oficial.
                  </p>
                </section>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Terms;
