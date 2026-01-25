import MainLayout from "@/components/MainLayout";
import { Card } from "@/components/ui/card";
import { Lock } from "lucide-react";
import { useEffect } from "react";
import { getCanonicalOrigin, setSeo } from "@/lib/seo";

const Privacy = () => {
  useEffect(() => {
    setSeo({
      title: "Política de Privacidade • Tornefy",
      description: "Entenda como coletamos, usamos e protegemos seus dados na Tornefy.",
      canonical: getCanonicalOrigin() + "/privacy",
    });
  }, []);

  const updatedAt = "21/01/2026";

  return (
    <MainLayout>
      <div className="relative py-16 mb-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/20 via-primary/5 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        <div className="container mx-auto px-4 relative z-10 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Lock className="w-8 h-8 text-primary" />
            <h1 className="text-3xl md:text-5xl font-black uppercase text-primary">Política de Privacidade</h1>
          </div>
          <p className="text-muted-foreground max-w-md mx-auto">
            Como coletamos, usamos e protegemos seus dados.
          </p>
        </div>
      </div>

      <main className="container mx-auto px-4 pb-16 max-w-4xl">
        <Card className="p-6 md:p-8 bg-card/50 border-border">
          <h2 className="text-2xl font-bold mb-6">Política de Privacidade</h2>

          <p className="text-sm text-muted-foreground mb-6">
            Última atualização: <span className="font-medium text-foreground">{updatedAt}</span>
          </p>

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
              <p>Não vendemos suas informações pessoais. Podemos compartilhar dados com:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Provedores de serviços que nos auxiliam na operação</li>
                <li>Outros usuários (informações públicas do perfil)</li>
                <li>Autoridades legais quando exigido por lei</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-foreground mb-2">4. Segurança dos Dados</h3>
              <p>Implementamos medidas de segurança para proteger suas informações, incluindo:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Criptografia de dados em trânsito e em repouso</li>
                <li>Controles de acesso e RLS no banco</li>
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
              <h3 className="text-lg font-semibold text-foreground mb-2">6. LGPD (Lei Geral de Proteção de Dados)</h3>
              <p>
                Tratamos dados pessoais conforme a LGPD (Lei nº 13.709/2018). As principais bases legais para o
                processamento incluem:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Execução de contrato (prestação do serviço)</li>
                <li>Legítimo interesse (segurança, prevenção a fraudes e melhoria do produto)</li>
                <li>Consentimento (quando aplicável, por exemplo, notificações e comunicações)</li>
              </ul>
              <p className="mt-2">
                Você pode solicitar informações, correção, portabilidade ou exclusão de dados dentro dos limites legais.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-foreground mb-2">7. Cookies</h3>
              <p>
                Utilizamos cookies para melhorar sua experiência, manter sua sessão ativa e analisar o uso da plataforma.
                Você pode controlar cookies através das configurações do navegador.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-foreground mb-2">8. Alterações nesta Política</h3>
              <p>
                Podemos atualizar esta política periodicamente. Notificaremos sobre mudanças significativas através da
                plataforma.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-foreground mb-2">9. Contato</h3>
              <p>
                Para questões sobre privacidade, entre em contato através do nosso Discord oficial (link no rodapé do
                site).
              </p>
            </section>
          </div>
        </Card>
      </main>
    </MainLayout>
  );
};

export default Privacy;
