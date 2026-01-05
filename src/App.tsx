import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import PlayerDashboard from "./pages/PlayerDashboard";
import TrainingDetails from "./pages/TrainingDetails";
import MyTeam from "./pages/MyTeam";
import OrganizerDashboard from "./pages/OrganizerDashboard";
import ExternalTeams from "./pages/ExternalTeams";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<PlayerDashboard />} />
          <Route path="/scrims" element={<Home />} />
          <Route path="/ranking" element={<Home />} />
          <Route path="/equipes" element={<Home />} />
          <Route path="/training/:id" element={<TrainingDetails />} />
          <Route path="/my-team" element={<MyTeam />} />
          <Route path="/organizer" element={<OrganizerDashboard />} />
          <Route path="/external-teams" element={<ExternalTeams />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
