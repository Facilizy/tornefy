import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LazyRouteErrorBoundary } from "@/components/LazyRouteErrorBoundary";
import { TwitchOAuthCallbackForwarder } from "@/components/twitch/TwitchOAuthCallbackForwarder";

const Home = lazy(() => import("./pages/Home"));
const Auth = lazy(() => import("./pages/Auth"));

const TrainingDetails = lazy(() => import("./pages/TrainingDetails"));
const MyTeam = lazy(() => import("./pages/MyTeam"));
const OrganizerDashboard = lazy(() => import("./pages/OrganizerDashboard"));
const RankingArtGenerator = lazy(() => import("./pages/RankingArtGenerator"));
const ExternalTeams = lazy(() => import("./pages/ExternalTeams"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const TeamProfile = lazy(() => import("./pages/TeamProfile"));
const Teams = lazy(() => import("./pages/Teams"));
const ProfileEdit = lazy(() => import("./pages/ProfileEdit"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Scrims = lazy(() => import("./pages/Scrims"));
const Ranking = lazy(() => import("./pages/Ranking"));
const Players = lazy(() => import("./pages/Players"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const PendingInvites = lazy(() => import("./pages/PendingInvites"));
const SentInvites = lazy(() => import("./pages/SentInvites"));
const Notifications = lazy(() => import("./pages/Notifications"));
const FAQ = lazy(() => import("./pages/FAQ"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AntiHack = lazy(() => import("./pages/AntiHack"));
const LiveOperator = lazy(() => import("./pages/LiveOperator"));

// Compat: redirecionar URLs antigas
const LegacyTrainingRedirect = lazy(() => import("./pages/LegacyTrainingRedirect"));

const OverlayTabelaGeral = lazy(() => import("./pages/overlays/OverlayTabelaGeral"));
const OverlayQueda = lazy(() => import("./pages/overlays/OverlayQueda"));
const OverlayRodada = lazy(() => import("./pages/overlays/OverlayRodada"));
const OverlayMvp = lazy(() => import("./pages/overlays/OverlayMvp"));
const OverlayMvpRanking = lazy(() => import("./pages/overlays/OverlayMvpRanking"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>

        <TwitchOAuthCallbackForwarder />
        <LazyRouteErrorBoundary>
          <Suspense
            fallback={
              <div className="min-h-[40vh] flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            }
          >
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/auth" element={<Auth />} />

              <Route path="/scrims" element={<Scrims />} />
              <Route path="/scrim/:id" element={<TrainingDetails />} />
              <Route path="/players" element={<Players />} />
              <Route path="/ranking" element={<Ranking />} />
              <Route path="/equipes" element={<Teams />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/faq/:slug" element={<FAQ />} />
              <Route path="/anti-hack" element={<AntiHack />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/profile/edit" element={<ProfileEdit />} />
              <Route path="/training/:id" element={<LegacyTrainingRedirect />} />
              <Route path="/my-team" element={<MyTeam />} />
              <Route path="/organizer" element={<OrganizerDashboard />} />
              <Route path="/organizer/ranking-art/:trainingId" element={<RankingArtGenerator />} />
              <Route path="/operador/:trainingId" element={<LiveOperator />} />
              <Route path="/external-teams" element={<ExternalTeams />} />
              <Route path="/profile" element={<UserProfile />} />
              <Route path="/profile/:userId" element={<UserProfile />} />
              <Route path="/team/:teamId" element={<TeamProfile />} />
              <Route path="/invites" element={<PendingInvites />} />
              <Route path="/sent-invites" element={<SentInvites />} />
              <Route path="/notificacoes" element={<Notifications />} />
              {/* Overlays (para OBS) */}
              <Route path="/overlays/tabela-geral" element={<OverlayTabelaGeral />} />
              <Route path="/overlays/queda" element={<OverlayQueda />} />
              <Route path="/overlays/rodada" element={<OverlayRodada />} />
              <Route path="/overlays/mvp" element={<OverlayMvp />} />
              <Route path="/overlays/mvp-ranking" element={<OverlayMvpRanking />} />

              {/* compat: manter urls antigas (html) funcionando via SPA */}
              <Route path="/overlays/overlay-tabela-geral.html" element={<OverlayTabelaGeral />} />
              <Route path="/overlays/overlay-queda.html" element={<OverlayQueda />} />
              <Route path="/overlays/overlay-rodada.html" element={<OverlayRodada />} />
              <Route path="/overlays/overlay-mvp.html" element={<OverlayMvp />} />
              <Route path="/overlays/overlay-mvp-ranking.html" element={<OverlayMvpRanking />} />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </LazyRouteErrorBoundary>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
