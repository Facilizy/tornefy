import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/MainLayout";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useI18n, type SupportedLanguage } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useUserRole } from "@/hooks/useUserRole";
import { useProfileData } from "@/hooks/useProfileData";
import { useProfileActions } from "@/hooks/useProfileActions";

import { PaymentComingSoon } from "@/components/payments/PaymentComingSoon";
import { AccountSidebar, type AccountSectionKey } from "@/components/profile-edit/AccountSidebar";
import { SecurityPanel } from "@/components/profile-edit/SecurityPanel";
import { SidebarSupportLinks } from "@/components/profile-edit/SidebarSupportLinks";
import { OrganizerPanel } from "@/components/profile-edit/OrganizerPanel";

import { ProfileDataForm } from "@/components/profile-edit/ProfileDataForm";
import { ProfilePersonalization } from "@/components/profile-edit/ProfilePersonalization";
import { ProfileIntegrations } from "@/components/profile-edit/ProfileIntegrations";

const ProfileEdit = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language, setLanguage } = useI18n();

  // State for Navigation
  const [section, setSection] = useState<AccountSectionKey>(() => {
    const sp = new URLSearchParams(window.location.search);
    const raw = sp.get("section");
    const allowed: AccountSectionKey[] = [
      "resumo",
      "transacoes",
      "retiradas",
      "seguranca",
      "perguntas",
      "dados",
      "personalizacao",
      "integracoes",
      "organizador",
    ];
    if (raw && allowed.includes(raw as AccountSectionKey)) return raw as AccountSectionKey;
    return "resumo";
  });

  // Hooks
  const {
    user,
    loading,
    formData,
    setFormData,
    frames,
    loadingFrames,
    mainTeam,
    linkedProviders,
    twitchConnected,
    twitchLogin,
    refreshTwitchConnection,
    refreshLinkedProviders,
  } = useProfileData();

  const actions = useProfileActions(
    user,
    formData,
    setFormData,
    refreshTwitchConnection,
    refreshLinkedProviders,
    mainTeam
  );

  const { role } = useUserRole(user?.id);


  // OAuth Params Cleanup
  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const hasTwitchParams = sp.has("code") && sp.has("state") && sp.has("scope");
    if (hasTwitchParams) {
      const supabaseUrl = (supabase as any)?.supabaseUrl as string | undefined;
      if (supabaseUrl) {
        window.location.replace(`${supabaseUrl}/functions/v1/twitch-oauth-callback${location.search}`);
      }
      return;
    }

    const hasAuthOAuthParams =
      location.search.includes("error=") ||
      location.hash.includes("access_token=") ||
      location.hash.includes("error=");

    if (hasAuthOAuthParams) {
      navigate("/profile/edit", { replace: true });
    }
  }, [location.search, location.hash, navigate]);

  // Twitch Connected Feedback
  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    if (sp.get("twitch") === "connected") {
      toast.success("Twitch conectado com sucesso!");
      if (user?.id) refreshTwitchConnection(user.id);
      sp.delete("twitch");
      const next = sp.toString();
      navigate(next ? `/profile/edit?${next}` : "/profile/edit", { replace: true });
    }
  }, [location.search, navigate, user?.id, refreshTwitchConnection]);

  // Sync Language
  useEffect(() => {
    if (formData.preferred_language && formData.preferred_language !== language) {
      // This might cause a loop if not careful, but formData init from DB sets it once.
      // However, ProfileDataForm updates formData.
      // We should only sync if it comes from the DB (initial load) or user explicit change.
      // The hook handles setting language? No, the hook just sets formData. 
      // We can keep this side effect here.
      setLanguage(formData.preferred_language);
    }
  }, [formData.preferred_language, language, setLanguage]);

  const handleLogout = async () => {
    try {
      await (supabase.auth as any).signOut({ scope: "local" });
    } catch {
      // best-effort
    } finally {
      toast.success("Logout realizado!");
      navigate("/auth");
    }
  };

  if (loading) {
    return (
      <MainLayout showUpcomingScrimWidget={false}>
        <div className="min-h-[50vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout showUpcomingScrimWidget={false}>
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Início • Conta</div>
            <h1 className="mt-1 text-2xl font-black uppercase">Minha conta</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Gerencie seus dados, TorneCoins e suas preferências.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => navigate("/profile")}
              type="button"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Perfil
            </Button>
            <div className="flex items-center gap-3 rounded-xl border border-border bg-card/40 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Idioma</p>
                <p className="text-xs text-muted-foreground">Preferência da conta</p>
              </div>
              <LanguageSelector
                value={formData.preferred_language}
                onChange={(lang) => {
                  setFormData((p) => ({ ...p, preferred_language: lang }));
                  setLanguage(lang);
                }}
              />
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
          <div className="space-y-3 lg:sticky lg:top-24 lg:h-fit">
            <AccountSidebar
              value={section}
              onChange={setSection}
              role={role}
              onAction={(actionId) => {
                if (actionId === "notifications") navigate("/notificacoes");
                if (actionId === "faq") navigate("/faq");
                if (actionId === "discord")
                  window.open("https://discord.gg/bHgPsBfN7r", "_blank", "noopener,noreferrer");
                if (actionId === "logout") void handleLogout();
              }}
            />

            <SidebarSupportLinks onFaq={() => navigate("/faq")} onDiscord={() => window.open("https://discord.gg/bHgPsBfN7r", "_blank", "noopener,noreferrer")} />
          </div>

          <div className="space-y-4">
            <PaymentComingSoon
              title="TorneCoins — Em Breve"
              description="Recarga, saldo e movimentações de TorneCoins estarão disponíveis em breve."
              className="w-full"
            />

            {section === "transacoes" && (
              <PaymentComingSoon
                title="Transações — Em Breve"
                description="O histórico de transações estará disponível assim que o sistema de pagamentos for ativado."
              />
            )}

            {section === "resumo" && (
              <>
                <Card className="p-5 bg-card/40 border-border">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-muted-foreground">Olá, {formData.username || formData.full_name || "jogador"}.</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        A Tornefy é <span className="font-semibold text-foreground">extremamente segura</span> — seus dados e acesso são protegidos.
                      </p>
                    </div>
                    <Button type="button" onClick={() => navigate("/profile")} className="md:w-auto">
                      Ver meu perfil
                    </Button>
                  </div>
                </Card>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <Button type="button" variant="outline" className="justify-start" onClick={() => setSection("dados")}>
                    Editar meus dados
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="justify-start"
                    onClick={() => setSection("personalizacao")}
                  >
                    Personalização
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="justify-start"
                    onClick={() => setSection("integracoes")}
                  >
                    Contas e integrações
                  </Button>
                </div>
              </>
            )}

            {section === "retiradas" && (
              <PaymentComingSoon
                title="Retiradas — Em Breve"
                description="A funcionalidade de retirada de TorneCoins estará disponível em breve."
              />
            )}

            {section === "seguranca" && (
              <SecurityPanel
                email={user?.email}
                onLoggedOut={() => {
                  navigate("/auth");
                }}
              />
            )}

            {section === "organizador" && (
              <OrganizerPanel
                onOpenDashboard={() => {
                  navigate("/organizer");
                }}
              />
            )}

            {section === "perguntas" && (
              <Card className="p-5 bg-card/40 border-border">
                <h2 className="text-lg font-black uppercase">Perguntas</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Em breve você vai gerenciar suas perguntas e as perguntas recebidas por aqui.
                </p>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-border bg-background/20 p-4">
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">Minhas perguntas</p>
                    <p className="mt-1 text-sm text-muted-foreground">Veja o histórico do que você perguntou na plataforma.</p>
                    <Button type="button" className="mt-3" disabled>
                      Abrir
                    </Button>
                  </div>
                  <div className="rounded-xl border border-border bg-background/20 p-4">
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">Perguntas recebidas</p>
                    <p className="mt-1 text-sm text-muted-foreground">Responda perguntas que outros usuários te enviaram.</p>
                    <Button type="button" className="mt-3" disabled>
                      Abrir
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {(section === "dados" || section === "personalizacao" || section === "integracoes") && (
              <Card className="p-6 md:p-8 bg-card/40 border-border">
                <h2 className="text-lg font-black uppercase mb-1">
                  {section === "dados"
                    ? "Meus dados"
                    : section === "personalizacao"
                      ? "Personalização"
                      : "Contas e integrações"}
                </h2>
                <p className="text-sm text-muted-foreground mb-8">
                  {section === "dados"
                    ? "Atualize seu perfil público e preferências."
                    : section === "personalizacao"
                      ? "Ajuste sua identidade dentro da Tornefy."
                      : "Conecte contas e configure seus IDs por jogo."}
                </p>

                {section === "dados" && (
                  <ProfileDataForm
                    formData={formData}
                    setFormData={setFormData}
                    mainTeam={mainTeam}
                    onSubmit={actions.handleSubmit}
                    saving={actions.saving}
                    onCancel={() => navigate("/profile")}
                    actions={actions}
                  />
                )}

                {section === "personalizacao" && (
                  <ProfilePersonalization
                    formData={formData}
                    setFormData={setFormData}
                    user={user}
                    frames={frames}
                    loadingFrames={loadingFrames}
                    onSubmit={actions.handleSubmit}
                    saving={actions.saving}
                    onCancel={() => navigate("/profile")}
                  />
                )}

                {section === "integracoes" && (
                  <ProfileIntegrations
                    user={user}
                    linkedProviders={linkedProviders}
                    twitchConnected={twitchConnected}
                    twitchLogin={twitchLogin}
                    connectingTwitch={actions.connectingTwitch}
                    syncingTwitch={actions.syncingTwitch}
                    linkingDiscord={actions.linkingDiscord}
                    linkingGoogle={actions.linkingGoogle}
                    actions={actions}
                    saving={actions.saving}
                    formData={formData}
                    onCancel={() => navigate("/profile")}
                  />
                )}
              </Card>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ProfileEdit;
