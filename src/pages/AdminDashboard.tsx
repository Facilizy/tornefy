import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { adminApi } from "@/lib/admin-api";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PopupsAdminTab } from "@/components/admin/PopupsAdminTab";
import { FaqAdminTab } from "@/components/admin/FaqAdminTab";
import { FinanceAdminTab } from "@/components/admin/FinanceAdminTab";

type AdminStats = {
  users: number;
  teams: number;
  trainings: number;
  verifiedEntities: number;
};

type Paginated<T> = {
  items: T[];
  total: number;
};

type TrainingRow = {
  id: string;
  name: string;
  organizer_id: string | null;
  game: string | null;
  platform: string | null;
  status: string | null;
  datetime: string | null;
  max_slots: number | null;
  is_private: boolean | null;
  deleted_at?: string | null;
};

type TeamRow = {
  id: string;
  name: string | null;
  tag: string | null;
  owner_id: string | null;
  is_verified: boolean | null;
  is_external: boolean | null;
  deleted_at?: string | null;
};

type UserRow = {
  id: string;
  full_name: string | null;
  username: string | null;
  preferred_language: string | null;
  available_for_team: boolean | null;
};

type UserDetails = UserRow & {
  avatar_url: string | null;
  banner_url: string | null;
  preferred_games: unknown | null;
};

type VerificationRow = {
  entity_type: string;
  entity_id: string;
  verified: boolean;
};

type AdminRow = {
  user_id: string;
  full_name: string | null;
  username: string | null;
  assigned_at: string | null;
};

type AuditRow = {
  id: string;
  actor_id: string;
  method: string;
  path: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  response_count: number | null;
  created_at: string;
};

type BugReportRow = {
  id: string;
  title: string;
  description: string;
  page_path: string;
  user_id: string;
  user_agent: string | null;
  created_at: string;
  meta: any;
};

function toDatetimeLocal(iso: string) {
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

function toIsoFromDatetimeLocal(localValue: string) {
  return localValue ? new Date(localValue).toISOString() : null;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<any>(null);

  // Validação de admin sempre server-side (edge function). Evita depender de SELECT em user_roles.
  const meQuery = useQuery({
    queryKey: ["admin", "me", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const res = await adminApi<{ user_id: string; is_admin: boolean }>("/me");
      // Se não for admin, a edge function agora retorna 200 com is_admin=false.
      // Ainda assim, mantemos fallback seguro para erros (sem estourar a tela).
      if (res.ok === false) return { user_id: String(user?.id ?? ""), is_admin: false };
      return res.data;
    },
    retry: 0,
  });

  const isAdmin = meQuery.isSuccess && meQuery.data?.is_admin;

  const [trainingsSearch, setTrainingsSearch] = useState("");
  const [trainingsStatus, setTrainingsStatus] = useState("");
  const [trainingsGame, setTrainingsGame] = useState("");
  const [trainingsPlatform, setTrainingsPlatform] = useState("");
  const [trainingsFrom, setTrainingsFrom] = useState("");
  const [trainingsTo, setTrainingsTo] = useState("");
  const [trainingsIncludeDeleted, setTrainingsIncludeDeleted] = useState(false);
  const [trainingsPage, setTrainingsPage] = useState(0);
  const [teamsSearch, setTeamsSearch] = useState("");
  const [teamsIncludeDeleted, setTeamsIncludeDeleted] = useState(false);
  const [teamsPage, setTeamsPage] = useState(0);
  const [usersSearch, setUsersSearch] = useState("");
  const [usersPage, setUsersPage] = useState(0);
  const [verificationsSearch, setVerificationsSearch] = useState("");
  const [verificationsPage, setVerificationsPage] = useState(0);

  const [adminsSearch, setAdminsSearch] = useState("");
  const [adminsPage, setAdminsPage] = useState(0);
  const [auditSearch, setAuditSearch] = useState("");
  const [auditActor, setAuditActor] = useState("");
  const [auditPage, setAuditPage] = useState(0);

  const [bugReportsSearch, setBugReportsSearch] = useState("");
  const [bugReportsPage, setBugReportsPage] = useState(0);

  const pageSize = 20;

  useEffect(() => {
    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
    })();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    if (meQuery.isLoading) return;
    if (!isAdmin) {
      toast.error("Acesso negado.");
      navigate("/");
    }
  }, [user, meQuery.isLoading, isAdmin, navigate]);

  const statsQuery = useQuery({
    queryKey: ["admin", "stats"],
    enabled: isAdmin,
    queryFn: async (): Promise<AdminStats> => {
      const res = await adminApi<AdminStats>("/stats");
      if (res.ok === false) throw new Error(res.error);
      return res.data;
    },
  });

  const trainingsQuery = useQuery({
    queryKey: [
      "admin",
      "trainings",
      trainingsSearch,
      trainingsStatus,
      trainingsGame,
      trainingsPlatform,
      trainingsFrom,
      trainingsTo,
      trainingsIncludeDeleted,
      trainingsPage,
    ],
    enabled: isAdmin,
    queryFn: async (): Promise<Paginated<TrainingRow>> => {
      const res = await adminApi<Paginated<TrainingRow>>("/trainings", {
        query: {
          search: trainingsSearch,
          status: trainingsStatus,
          game: trainingsGame,
          platform: trainingsPlatform,
          from: trainingsFrom,
          to: trainingsTo,
          include_deleted: trainingsIncludeDeleted ? "1" : "0",
          limit: String(pageSize),
          offset: String(trainingsPage * pageSize),
        },
      });
      if (res.ok === false) throw new Error(res.error);
      return res.data;
    },
  });

  const teamsQuery = useQuery({
    queryKey: ["admin", "teams", teamsSearch, teamsIncludeDeleted, teamsPage],
    enabled: isAdmin,
    queryFn: async (): Promise<Paginated<TeamRow>> => {
      const res = await adminApi<Paginated<TeamRow>>("/teams", {
        query: {
          search: teamsSearch,
          include_deleted: teamsIncludeDeleted ? "1" : "0",
          limit: String(pageSize),
          offset: String(teamsPage * pageSize),
        },
      });
      if (res.ok === false) throw new Error(res.error);
      return res.data;
    },
  });

  const usersQuery = useQuery({
    queryKey: ["admin", "users", usersSearch, usersPage],
    enabled: isAdmin,
    queryFn: async (): Promise<Paginated<UserRow>> => {
      const res = await adminApi<Paginated<UserRow>>("/users", {
        query: {
          search: usersSearch,
          limit: String(pageSize),
          offset: String(usersPage * pageSize),
        },
      });
      if (res.ok === false) throw new Error(res.error);
      return res.data;
    },
  });

  const verificationsQuery = useQuery({
    queryKey: ["admin", "verifications", verificationsSearch, verificationsPage],
    enabled: isAdmin,
    queryFn: async (): Promise<Paginated<VerificationRow>> => {
      const res = await adminApi<Paginated<VerificationRow>>("/verifications", {
        query: {
          search: verificationsSearch,
          limit: String(pageSize),
          offset: String(verificationsPage * pageSize),
        },
      });
      if (res.ok === false) throw new Error(res.error);
      return res.data;
    },
  });

  const adminsQuery = useQuery({
    queryKey: ["admin", "admins", adminsSearch, adminsPage],
    enabled: isAdmin,
    queryFn: async (): Promise<Paginated<AdminRow>> => {
      const res = await adminApi<Paginated<AdminRow>>("/admins", {
        query: {
          search: adminsSearch,
          limit: String(pageSize),
          offset: String(adminsPage * pageSize),
        },
      });
      if (res.ok === false) throw new Error(res.error);
      return res.data;
    },
  });

  const auditQuery = useQuery({
    queryKey: ["admin", "audit", auditSearch, auditActor, auditPage],
    enabled: isAdmin,
    queryFn: async (): Promise<Paginated<AuditRow>> => {
      const res = await adminApi<Paginated<AuditRow>>("/audit", {
        query: {
          search: auditSearch,
          actor: auditActor,
          limit: String(pageSize),
          offset: String(auditPage * pageSize),
        },
      });
      if (res.ok === false) throw new Error(res.error);
      return res.data;
    },
  });

  const bugReportsQuery = useQuery({
    queryKey: ["admin", "bug-reports", bugReportsSearch, bugReportsPage],
    enabled: isAdmin,
    queryFn: async (): Promise<Paginated<BugReportRow>> => {
      const res = await adminApi<Paginated<BugReportRow>>("/bug-reports", {
        query: {
          search: bugReportsSearch,
          limit: String(pageSize),
          offset: String(bugReportsPage * pageSize),
        },
      });
      if (res.ok === false) throw new Error(res.error);
      return res.data;
    },
  });

  const stats = statsQuery.data;
  const trainings = trainingsQuery.data?.items ?? [];
  const trainingsTotal = trainingsQuery.data?.total ?? 0;
  const teams = teamsQuery.data?.items ?? [];
  const teamsTotal = teamsQuery.data?.total ?? 0;
  const users = usersQuery.data?.items ?? [];
  const usersTotal = usersQuery.data?.total ?? 0;
  const verifications = verificationsQuery.data?.items ?? [];
  const verificationsTotal = verificationsQuery.data?.total ?? 0;
  const admins = adminsQuery.data?.items ?? [];
  const adminsTotal = adminsQuery.data?.total ?? 0;
  const auditRows = auditQuery.data?.items ?? [];
  const auditTotal = auditQuery.data?.total ?? 0;

  const bugReports = bugReportsQuery.data?.items ?? [];
  const bugReportsTotal = bugReportsQuery.data?.total ?? 0;

  const statsCards = useMemo(
    () =>
      [
        { label: "Usuários", value: stats?.users ?? 0 },
        { label: "Equipes", value: stats?.teams ?? 0 },
        { label: "Treinos", value: stats?.trainings ?? 0 },
        { label: "Verificações", value: stats?.verifiedEntities ?? 0 },
      ] as const,
    [stats],
  );

  if (!user) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-10">
          <div className="min-h-[40vh] flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <header className="flex flex-col gap-2 mb-6">
          <h1 className="text-2xl font-semibold">Admin</h1>
          <p className="text-sm text-muted-foreground">Controle geral da plataforma (leitura + edição via modais).</p>
        </header>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full justify-start flex-wrap h-auto">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="finance">Financeiro</TabsTrigger>
            <TabsTrigger value="trainings">Treinos</TabsTrigger>
            <TabsTrigger value="teams">Equipes</TabsTrigger>
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="bugReports">Bug reports</TabsTrigger>
            <TabsTrigger value="verifications">Verificações</TabsTrigger>
            <TabsTrigger value="popups">Popups</TabsTrigger>
            <TabsTrigger value="faq">FAQ</TabsTrigger>
            <TabsTrigger value="admins">Admins</TabsTrigger>
            <TabsTrigger value="audit">Auditoria</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {statsCards.map((c) => (
                <Card key={c.label} className="p-4">
                  <div className="text-xs text-muted-foreground">{c.label}</div>
                  <div className="text-2xl font-semibold mt-1">{c.value}</div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="finance">
            <FinanceAdminTab />
          </TabsContent>

          <TabsContent value="trainings">
            <section className="mt-4">
              <div className="grid gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                  <div className="w-full">
                    <Label htmlFor="trainingsSearch">Buscar</Label>
                    <Input
                      id="trainingsSearch"
                      value={trainingsSearch}
                      onChange={(e) => {
                        setTrainingsSearch(e.target.value);
                        setTrainingsPage(0);
                      }}
                      placeholder="Nome do treino"
                    />
                  </div>
                  <div className="w-full">
                    <Label>Status</Label>
                    <Input
                      value={trainingsStatus}
                      onChange={(e) => {
                        setTrainingsStatus(e.target.value);
                        setTrainingsPage(0);
                      }}
                      placeholder="INSCRIÇÕES ABERTAS"
                    />
                  </div>
                  <div className="w-full">
                    <Label>Jogo</Label>
                    <Input
                      value={trainingsGame}
                      onChange={(e) => {
                        setTrainingsGame(e.target.value);
                        setTrainingsPage(0);
                      }}
                      placeholder="free_fire"
                    />
                  </div>
                  <div className="w-full">
                    <Label>Plataforma</Label>
                    <Input
                      value={trainingsPlatform}
                      onChange={(e) => {
                        setTrainingsPlatform(e.target.value);
                        setTrainingsPage(0);
                      }}
                      placeholder="Mobile"
                    />
                  </div>
                  <div className="w-full">
                    <Label>De (ISO)</Label>
                    <Input
                      value={trainingsFrom}
                      onChange={(e) => {
                        setTrainingsFrom(e.target.value);
                        setTrainingsPage(0);
                      }}
                      placeholder="2026-01-01T00:00:00Z"
                    />
                  </div>
                  <div className="w-full">
                    <Label>Até (ISO)</Label>
                    <Input
                      value={trainingsTo}
                      onChange={(e) => {
                        setTrainingsTo(e.target.value);
                        setTrainingsPage(0);
                      }}
                      placeholder="2026-12-31T23:59:59Z"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={trainingsIncludeDeleted}
                      onChange={(e) => {
                        setTrainingsIncludeDeleted(e.target.checked);
                        setTrainingsPage(0);
                      }}
                    />
                    Incluir excluídos
                  </label>
                  <div className="ml-auto flex items-center gap-2">
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => setTrainingsPage((p) => Math.max(p - 1, 0))}
                      disabled={trainingsPage === 0}
                    >
                      Anterior
                    </Button>
                    <div className="text-xs text-muted-foreground">
                      {trainingsTotal ? trainingsPage * pageSize + 1 : 0}-{Math.min((trainingsPage + 1) * pageSize, trainingsTotal)} de {trainingsTotal}
                    </div>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => setTrainingsPage((p) => p + 1)}
                      disabled={(trainingsPage + 1) * pageSize >= trainingsTotal}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Jogo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trainings.map((t) => (
                      <TrainingRowItem
                        key={t.id}
                        training={t}
                        onUpdated={async () => {
                          await queryClient.invalidateQueries({ queryKey: ["admin", "trainings"] });
                          await queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
                        }}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          </TabsContent>

          <TabsContent value="teams">
            <section className="mt-4">
              <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                <div className="w-full sm:max-w-sm">
                  <Label htmlFor="teamsSearch">Buscar</Label>
                  <Input
                    id="teamsSearch"
                    value={teamsSearch}
                    onChange={(e) => {
                      setTeamsSearch(e.target.value);
                      setTeamsPage(0);
                    }}
                    placeholder="Nome ou tag"
                  />
                </div>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={teamsIncludeDeleted}
                    onChange={(e) => {
                      setTeamsIncludeDeleted(e.target.checked);
                      setTeamsPage(0);
                    }}
                  />
                  Incluir excluídos
                </label>
                <div className="ml-auto flex items-center gap-2">
                  <Button size="xs" variant="outline" onClick={() => setTeamsPage((p) => Math.max(p - 1, 0))} disabled={teamsPage === 0}>
                    Anterior
                  </Button>
                  <div className="text-xs text-muted-foreground">
                    {teamsTotal ? teamsPage * pageSize + 1 : 0}-{Math.min((teamsPage + 1) * pageSize, teamsTotal)} de {teamsTotal}
                  </div>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => setTeamsPage((p) => p + 1)}
                    disabled={(teamsPage + 1) * pageSize >= teamsTotal}
                  >
                    Próxima
                  </Button>
                </div>
              </div>

              <div className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Equipe</TableHead>
                      <TableHead>Tag</TableHead>
                      <TableHead>Dono</TableHead>
                      <TableHead>Verificada</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teams.map((t) => (
                      <TeamRowItem
                        key={t.id}
                        team={t}
                        onUpdated={async () => {
                          await queryClient.invalidateQueries({ queryKey: ["admin", "teams"] });
                          await queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
                        }}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          </TabsContent>

          <TabsContent value="users">
            <section className="mt-4">
              <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                <div className="w-full sm:max-w-sm">
                  <Label htmlFor="usersSearch">Buscar</Label>
                  <Input
                    id="usersSearch"
                    value={usersSearch}
                    onChange={(e) => {
                      setUsersSearch(e.target.value);
                      setUsersPage(0);
                    }}
                    placeholder="Nome ou username"
                  />
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <Button size="xs" variant="outline" onClick={() => setUsersPage((p) => Math.max(p - 1, 0))} disabled={usersPage === 0}>
                    Anterior
                  </Button>
                  <div className="text-xs text-muted-foreground">
                    {usersTotal ? usersPage * pageSize + 1 : 0}-{Math.min((usersPage + 1) * pageSize, usersTotal)} de {usersTotal}
                  </div>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => setUsersPage((p) => p + 1)}
                    disabled={(usersPage + 1) * pageSize >= usersTotal}
                  >
                    Próxima
                  </Button>
                </div>
              </div>

              <div className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Idioma</TableHead>
                      <TableHead>Disponível</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <UserRowItem
                        key={u.id}
                        user={u}
                        onUpdated={async () => {
                          await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
                        }}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          </TabsContent>

          <TabsContent value="bugReports">
            <section className="mt-4">
              <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                <div className="w-full sm:max-w-sm">
                  <Label htmlFor="bugReportsSearch">Buscar</Label>
                  <Input
                    id="bugReportsSearch"
                    value={bugReportsSearch}
                    onChange={(e) => {
                      setBugReportsSearch(e.target.value);
                      setBugReportsPage(0);
                    }}
                    placeholder="title/descrição/path/user_id"
                  />
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => setBugReportsPage((p) => Math.max(p - 1, 0))}
                    disabled={bugReportsPage === 0}
                  >
                    Anterior
                  </Button>
                  <div className="text-xs text-muted-foreground">
                    {bugReportsTotal ? bugReportsPage * pageSize + 1 : 0}-
                    {Math.min((bugReportsPage + 1) * pageSize, bugReportsTotal)} de {bugReportsTotal}
                  </div>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => setBugReportsPage((p) => p + 1)}
                    disabled={(bugReportsPage + 1) * pageSize >= bugReportsTotal}
                  >
                    Próxima
                  </Button>
                </div>
              </div>

              <div className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Quando</TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead>Path</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead className="text-right">Detalhes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bugReports.map((r) => (
                      <BugReportRowItem key={r.id} row={r} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          </TabsContent>

          <TabsContent value="verifications">
            <section className="mt-4">
              <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                <div className="w-full sm:max-w-sm">
                  <Label htmlFor="verificationsSearch">Buscar</Label>
                  <Input
                    id="verificationsSearch"
                    value={verificationsSearch}
                    onChange={(e) => {
                      setVerificationsSearch(e.target.value);
                      setVerificationsPage(0);
                    }}
                    placeholder="entity_id"
                  />
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <Button size="xs" variant="outline" onClick={() => setVerificationsPage((p) => Math.max(p - 1, 0))} disabled={verificationsPage === 0}>
                    Anterior
                  </Button>
                  <div className="text-xs text-muted-foreground">
                    {verificationsTotal ? verificationsPage * pageSize + 1 : 0}-{Math.min((verificationsPage + 1) * pageSize, verificationsTotal)} de {verificationsTotal}
                  </div>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => setVerificationsPage((p) => p + 1)}
                    disabled={(verificationsPage + 1) * pageSize >= verificationsTotal}
                  >
                    Próxima
                  </Button>
                </div>
              </div>

              <div className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Entity ID</TableHead>
                      <TableHead>Verificado</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {verifications.map((v) => (
                      <VerificationRowItem
                        key={`${v.entity_type}:${v.entity_id}`}
                        row={v}
                        onUpdated={async () => {
                          await queryClient.invalidateQueries({ queryKey: ["admin", "verifications"] });
                          await queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
                        }}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          </TabsContent>

          <TabsContent value="popups">
            <PopupsAdminTab />
          </TabsContent>

          <TabsContent value="faq">
            <FaqAdminTab />
          </TabsContent>

          <TabsContent value="admins">
            <section className="mt-4">
              <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                <div className="w-full sm:max-w-sm">
                  <Label>Buscar</Label>
                  <Input
                    value={adminsSearch}
                    onChange={(e) => {
                      setAdminsSearch(e.target.value);
                      setAdminsPage(0);
                    }}
                    placeholder="Nome ou username"
                  />
                </div>
                <GrantAdminDialog
                  onDone={async () => {
                    await queryClient.invalidateQueries({ queryKey: ["admin", "admins"] });
                    await queryClient.invalidateQueries({ queryKey: ["admin", "audit"] });
                  }}
                />
                <div className="ml-auto flex items-center gap-2">
                  <Button size="xs" variant="outline" onClick={() => setAdminsPage((p) => Math.max(p - 1, 0))} disabled={adminsPage === 0}>
                    Anterior
                  </Button>
                  <div className="text-xs text-muted-foreground">
                    {adminsTotal ? adminsPage * pageSize + 1 : 0}-{Math.min((adminsPage + 1) * pageSize, adminsTotal)} de {adminsTotal}
                  </div>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => setAdminsPage((p) => p + 1)}
                    disabled={(adminsPage + 1) * pageSize >= adminsTotal}
                  >
                    Próxima
                  </Button>
                </div>
              </div>

              <div className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>User ID</TableHead>
                      <TableHead>Desde</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {admins.map((a) => (
                      <AdminRowItem
                        key={a.user_id}
                        row={a}
                        onUpdated={async () => {
                          await queryClient.invalidateQueries({ queryKey: ["admin", "admins"] });
                          await queryClient.invalidateQueries({ queryKey: ["admin", "audit"] });
                        }}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          </TabsContent>

          <TabsContent value="audit">
            <section className="mt-4">
              <div className="flex flex-col lg:flex-row lg:items-end gap-3">
                <div className="w-full lg:max-w-sm">
                  <Label>Buscar</Label>
                  <Input
                    value={auditSearch}
                    onChange={(e) => {
                      setAuditSearch(e.target.value);
                      setAuditPage(0);
                    }}
                    placeholder="path/action/entity_id"
                  />
                </div>
                <div className="w-full lg:max-w-sm">
                  <Label>Actor (user_id)</Label>
                  <Input
                    value={auditActor}
                    onChange={(e) => {
                      setAuditActor(e.target.value);
                      setAuditPage(0);
                    }}
                    placeholder="user_id"
                  />
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <Button size="xs" variant="outline" onClick={() => setAuditPage((p) => Math.max(p - 1, 0))} disabled={auditPage === 0}>
                    Anterior
                  </Button>
                  <div className="text-xs text-muted-foreground">
                    {auditTotal ? auditPage * pageSize + 1 : 0}-{Math.min((auditPage + 1) * pageSize, auditTotal)} de {auditTotal}
                  </div>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => setAuditPage((p) => p + 1)}
                    disabled={(auditPage + 1) * pageSize >= auditTotal}
                  >
                    Próxima
                  </Button>
                </div>
              </div>

              <div className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Quando</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Path</TableHead>
                      <TableHead>Entidade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditRows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs">
                          {format(new Date(r.created_at), "dd/MM HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{r.actor_id}</TableCell>
                        <TableCell className="text-xs">{r.action}</TableCell>
                        <TableCell className="text-xs truncate max-w-[360px]">{r.path}</TableCell>
                        <TableCell className="text-xs">
                          {r.entity_type ? `${r.entity_type}:${r.entity_id}` : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

function strongConfirm(message: string) {
  const v = window.prompt(`${message}\n\nDigite EXCLUIR para confirmar:`);
  return String(v ?? "").trim().toUpperCase() === "EXCLUIR";
}

function TrainingRowItem({
  training,
  onUpdated,
}: {
  training: TrainingRow;
  onUpdated: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState(training.name ?? "");
  const [status, setStatus] = useState(training.status ?? "");
  const [datetime, setDatetime] = useState(training.datetime ? toDatetimeLocal(training.datetime) : "");
  const [maxSlots, setMaxSlots] = useState(training.max_slots ? String(training.max_slots) : "");

  const prettyDate = training.datetime
    ? format(new Date(training.datetime), "dd/MM/yyyy HH:mm", { locale: ptBR })
    : "-";

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any = {
        name,
        status,
        max_slots: maxSlots ? Number(maxSlots) : null,
        datetime: datetime ? toIsoFromDatetimeLocal(datetime) : null,
      };

      const res = await adminApi(`/trainings/${training.id}`, { method: "PATCH", body: payload });
      if (res.ok === false) throw new Error(res.error);
      toast.success("Treino atualizado!");
      setOpen(false);
      await onUpdated();
    } catch (e: any) {
      toast.error(e.message || "Erro ao atualizar treino");
    } finally {
      setSaving(false);
    }
  };

  const softDelete = async () => {
    if (!strongConfirm(`Excluir (soft delete) o treino "${training.name}"?`)) return;
    try {
      const res = await adminApi(`/trainings/${training.id}`, { method: "DELETE" });
      if (res.ok === false) throw new Error(res.error);
      toast.success("Treino excluído (soft delete)!");
      await onUpdated();
    } catch (e: any) {
      toast.error(e.message || "Erro ao excluir treino");
    }
  };

  const restore = async () => {
    try {
      const res = await adminApi(`/trainings/${training.id}/restore`, { method: "POST" });
      if (res.ok === false) throw new Error(res.error);
      toast.success("Treino restaurado!");
      await onUpdated();
    } catch (e: any) {
      toast.error(e.message || "Erro ao restaurar treino");
    }
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{training.name}</TableCell>
      <TableCell>{training.game ?? "-"}</TableCell>
      <TableCell>{training.status ?? "-"}</TableCell>
      <TableCell>{prettyDate}</TableCell>
      <TableCell className="text-right">
        <div className="inline-flex items-center gap-2">
          {training.deleted_at ? (
            <Button size="xs" variant="outline" onClick={restore}>
              Restaurar
            </Button>
          ) : (
            <Button size="xs" variant="destructive" onClick={softDelete}>
              Excluir
            </Button>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="xs" variant="outline">Editar</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar treino</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label>Nome</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Status</Label>
                  <Input value={status} onChange={(e) => setStatus(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Data/Hora</Label>
                  <Input type="datetime-local" value={datetime} onChange={(e) => setDatetime(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Máx. slots</Label>
                  <Input value={maxSlots} onChange={(e) => setMaxSlots(e.target.value)} inputMode="numeric" />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Button size="xs" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                    Cancelar
                  </Button>
                  <Button size="xs" onClick={handleSave} disabled={saving}>
                    {saving ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </TableCell>
    </TableRow>
  );
}

function TeamRowItem({
  team,
  onUpdated,
}: {
  team: TeamRow;
  onUpdated: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(team.name ?? "");
  const [tag, setTag] = useState(team.tag ?? "");
  const [isVerified, setIsVerified] = useState(Boolean(team.is_verified));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await adminApi(`/teams/${team.id}`, {
        method: "PATCH",
        body: { name, tag, is_verified: isVerified },
      });
      if (res.ok === false) throw new Error(res.error);
      toast.success("Equipe atualizada!");
      setOpen(false);
      await onUpdated();
    } catch (e: any) {
      toast.error(e.message || "Erro ao atualizar equipe");
    } finally {
      setSaving(false);
    }
  };

  const softDelete = async () => {
    if (!strongConfirm(`Excluir (soft delete) a equipe "${team.name ?? team.id}"?`)) return;
    try {
      const res = await adminApi(`/teams/${team.id}`, { method: "DELETE" });
      if (res.ok === false) throw new Error(res.error);
      toast.success("Equipe excluída (soft delete)!");
      await onUpdated();
    } catch (e: any) {
      toast.error(e.message || "Erro ao excluir equipe");
    }
  };

  const restore = async () => {
    try {
      const res = await adminApi(`/teams/${team.id}/restore`, { method: "POST" });
      if (res.ok === false) throw new Error(res.error);
      toast.success("Equipe restaurada!");
      await onUpdated();
    } catch (e: any) {
      toast.error(e.message || "Erro ao restaurar equipe");
    }
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{team.name ?? "-"}</TableCell>
      <TableCell>{team.tag ?? "-"}</TableCell>
      <TableCell className="truncate max-w-[220px]">{team.owner_id ?? "-"}</TableCell>
      <TableCell>{team.is_verified ? "Sim" : "Não"}</TableCell>
      <TableCell className="text-right">
        <div className="inline-flex items-center gap-2">
          {team.deleted_at ? (
            <Button size="xs" variant="outline" onClick={restore}>
              Restaurar
            </Button>
          ) : (
            <Button size="xs" variant="destructive" onClick={softDelete}>
              Excluir
            </Button>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="xs" variant="outline">Editar</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar equipe</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label>Nome</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Tag</Label>
                  <Input value={tag} onChange={(e) => setTag(e.target.value)} />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id={`team_verified_${team.id}`}
                    type="checkbox"
                    checked={isVerified}
                    onChange={(e) => setIsVerified(e.target.checked)}
                  />
                  <Label htmlFor={`team_verified_${team.id}`}>Equipe verificada</Label>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Button size="xs" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                    Cancelar
                  </Button>
                  <Button size="xs" onClick={handleSave} disabled={saving}>
                    {saving ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </TableCell>
    </TableRow>
  );
}

function GrantAdminDialog({ onDone }: { onDone: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [saving, setSaving] = useState(false);

  const grant = async () => {
    if (!userId.trim()) return;
    setSaving(true);
    try {
      const res = await adminApi("/admins/grant", { method: "POST", body: { user_id: userId.trim() } });
      if (res.ok === false) throw new Error(res.error);
      toast.success("Admin concedido!");
      setOpen(false);
      setUserId("");
      await onDone();
    } catch (e: any) {
      toast.error(e.message || "Erro ao conceder admin");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="xs">Conceder admin</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Conceder admin</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>User ID</Label>
            <Input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="uuid/text id do usuário" />
            <p className="text-xs text-muted-foreground">
              Por segurança, o grant é feito por <span className="font-mono">user_id</span> (não por e-mail).
            </p>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button size="xs" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button size="xs" onClick={grant} disabled={saving || !userId.trim()}>
              {saving ? "Concedendo..." : "Conceder"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AdminRowItem({ row, onUpdated }: { row: AdminRow; onUpdated: () => Promise<void> }) {
  const revoke = async () => {
    if (!window.confirm(`Remover admin de ${row.full_name ?? row.user_id}?`)) return;
    try {
      const res = await adminApi("/admins/revoke", { method: "POST", body: { user_id: row.user_id } });
      if (res.ok === false) throw new Error(res.error);
      toast.success("Admin removido!");
      await onUpdated();
    } catch (e: any) {
      toast.error(e.message || "Erro ao remover admin");
    }
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{row.full_name ?? "-"}</TableCell>
      <TableCell>{row.username ?? "-"}</TableCell>
      <TableCell className="font-mono text-xs">{row.user_id}</TableCell>
      <TableCell className="text-xs">
        {row.assigned_at ? format(new Date(row.assigned_at), "dd/MM/yyyy", { locale: ptBR }) : "-"}
      </TableCell>
      <TableCell className="text-right">
        <Button size="xs" variant="destructive" onClick={revoke}>
          Remover
        </Button>
      </TableCell>
    </TableRow>
  );
}

function UserRowItem({ user, onUpdated }: { user: UserRow; onUpdated: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [details, setDetails] = useState<UserDetails | null>(null);
  const [fullName, setFullName] = useState(user.full_name ?? "");
  const [preferredLanguage, setPreferredLanguage] = useState(user.preferred_language ?? "");
  const [available, setAvailable] = useState(Boolean(user.available_for_team));
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [bannerUrl, setBannerUrl] = useState<string>("");
  const [preferredGamesText, setPreferredGamesText] = useState<string>("");
  const [rolesLoading, setRolesLoading] = useState(false);
  const [organizerVerified, setOrganizerVerified] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoadingDetails(true);
    void (async () => {
      try {
        const res = await adminApi<UserDetails>(`/users/${user.id}`);
        if (res.ok === false) throw new Error(res.error);
        setDetails(res.data);
        setFullName(res.data.full_name ?? "");
        setPreferredLanguage(res.data.preferred_language ?? "");
        setAvailable(Boolean(res.data.available_for_team));
        setAvatarUrl(res.data.avatar_url ?? "");
        setBannerUrl(res.data.banner_url ?? "");
        setPreferredGamesText(res.data.preferred_games ? JSON.stringify(res.data.preferred_games, null, 2) : "");

        setRolesLoading(true);
        const rolesRes = await adminApi<{ roles: string[] }>(`/users/${user.id}/roles`);
        if (rolesRes.ok === false) throw new Error(rolesRes.error);
        setOrganizerVerified((rolesRes.data.roles || []).includes("organizer_verified"));
      } catch (e: any) {
        toast.error(e.message || "Erro ao carregar usuário");
      } finally {
        setLoadingDetails(false);
        setRolesLoading(false);
      }
    })();
  }, [open, user.id]);

  const toggleOrganizerVerified = async (enabled: boolean) => {
    try {
      setSaving(true);
      const res = await adminApi(`/users/${user.id}/roles`, {
        method: "POST",
        body: { role: "organizer_verified", enabled },
      });
      if (res.ok === false) throw new Error(res.error);
      setOrganizerVerified(enabled);
      toast.success(enabled ? "Organizador verificado!" : "Verificação removida!");
    } catch (e: any) {
      toast.error(e.message || "Erro ao atualizar verificação");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let preferred_games: any = null;
      if (preferredGamesText.trim()) {
        try {
          preferred_games = JSON.parse(preferredGamesText);
        } catch {
          throw new Error("preferred_games deve ser um JSON válido");
        }
      }

      const res = await adminApi(`/users/${user.id}`, {
        method: "PATCH",
        body: {
          full_name: fullName,
          avatar_url: avatarUrl.trim() || null,
          banner_url: bannerUrl.trim() || null,
          preferred_games,
          preferred_language: preferredLanguage || null,
          available_for_team: available,
        },
      });
      if (res.ok === false) throw new Error(res.error);
      toast.success("Usuário atualizado!");
      setOpen(false);
      await onUpdated();
    } catch (e: any) {
      toast.error(e.message || "Erro ao atualizar usuário");
    } finally {
      setSaving(false);
    }
  };

  const resetUsername = async () => {
    if (!window.confirm(`Resetar o username de ${user.full_name ?? user.id}?\n\nIsso vai forçar onboarding no próximo login.`)) {
      return;
    }
    try {
      const res = await adminApi(`/users/${user.id}/reset-username`, { method: "POST" });
      if (res.ok === false) throw new Error(res.error);
      toast.success("Username resetado!");
      setOpen(false);
      await onUpdated();
    } catch (e: any) {
      toast.error(e.message || "Erro ao resetar username");
    }
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{user.full_name ?? "-"}</TableCell>
      <TableCell>{user.username ?? "-"}</TableCell>
      <TableCell>{user.preferred_language ?? "-"}</TableCell>
      <TableCell>{user.available_for_team ? "Sim" : "Não"}</TableCell>
      <TableCell className="text-right">
        <div className="inline-flex items-center gap-2">
          <Button size="xs" variant="ghost" onClick={() => window.open(`/profile/${user.id}`, "_blank")}>
            Ver
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="xs" variant="outline">Editar</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar usuário</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3">
                {loadingDetails ? (
                  <div className="text-sm text-muted-foreground">Carregando...</div>
                ) : null}
                <div className="grid gap-1.5">
                  <Label>Nome</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Avatar URL</Label>
                  <Input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." />
                </div>
                <div className="grid gap-1.5">
                  <Label>Banner URL</Label>
                  <Input value={bannerUrl} onChange={(e) => setBannerUrl(e.target.value)} placeholder="https://..." />
                </div>
                <div className="grid gap-1.5">
                  <Label>preferred_games (JSON)</Label>
                  <Textarea
                    value={preferredGamesText}
                    onChange={(e) => setPreferredGamesText(e.target.value)}
                    placeholder='["free_fire", "farlight_84"]'
                    rows={6}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Idioma</Label>
                  <Input value={preferredLanguage} onChange={(e) => setPreferredLanguage(e.target.value)} placeholder="pt-BR" />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id={`user_available_${user.id}`}
                    type="checkbox"
                    checked={available}
                    onChange={(e) => setAvailable(e.target.checked)}
                  />
                  <Label htmlFor={`user_available_${user.id}`}>Disponível para equipe</Label>
                </div>

                <Card className="p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">Organizador verificado</div>
                      <div className="text-xs text-muted-foreground">
                        {rolesLoading ? "Carregando roles…" : "Define role organizer_verified"}
                      </div>
                    </div>
                    <Button
                      size="xs"
                      variant={organizerVerified ? "outline" : "default"}
                      onClick={() => toggleOrganizerVerified(!organizerVerified)}
                      disabled={saving || rolesLoading || loadingDetails}
                    >
                      {organizerVerified ? "Remover" : "Verificar"}
                    </Button>
                  </div>
                </Card>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Button size="xs" variant="outline" onClick={resetUsername} disabled={saving || loadingDetails}>
                    Resetar username
                  </Button>
                  <div className="ml-auto flex items-center gap-2">
                  <Button size="xs" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                    Cancelar
                  </Button>
                  <Button size="xs" onClick={handleSave} disabled={saving || loadingDetails}>
                    {saving ? "Salvando..." : "Salvar"}
                  </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </TableCell>
    </TableRow>
  );
}

function VerificationRowItem({
  row,
  onUpdated,
}: {
  row: VerificationRow;
  onUpdated: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);

  const toggle = async () => {
    setSaving(true);
    try {
      const res = await adminApi("/verifications", {
        method: "POST",
        body: {
          entity_type: row.entity_type,
          entity_id: row.entity_id,
          verified: !row.verified,
        },
      });
      if (res.ok === false) throw new Error(res.error);
      toast.success("Verificação atualizada!");
      await onUpdated();
    } catch (e: any) {
      toast.error(e.message || "Erro ao atualizar verificação");
    } finally {
      setSaving(false);
    }
  };

  return (
    <TableRow>
      <TableCell>{row.entity_type}</TableCell>
      <TableCell className="font-mono text-xs">{row.entity_id}</TableCell>
      <TableCell>{row.verified ? "Sim" : "Não"}</TableCell>
      <TableCell className="text-right">
        <Button size="xs" variant="outline" onClick={toggle} disabled={saving}>
          {saving ? "..." : row.verified ? "Remover" : "Marcar"}
        </Button>
      </TableCell>
    </TableRow>
  );
}

export default AdminDashboard;

function BugReportRowItem({ row }: { row: BugReportRow }) {
  const [open, setOpen] = useState(false);

  return (
    <TableRow>
      <TableCell className="text-xs">
        {format(new Date(row.created_at), "dd/MM HH:mm", { locale: ptBR })}
      </TableCell>
      <TableCell className="font-medium max-w-[320px] truncate">{row.title}</TableCell>
      <TableCell className="text-xs max-w-[260px] truncate">{row.page_path}</TableCell>
      <TableCell className="font-mono text-xs max-w-[240px] truncate">{row.user_id}</TableCell>
      <TableCell className="text-right">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="xs" variant="outline">
              Ver
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{row.title}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="text-xs text-muted-foreground">
                {format(new Date(row.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })} • {row.page_path}
              </div>
              <Card className="p-3">
                <div className="text-sm whitespace-pre-wrap">{row.description}</div>
              </Card>
              <div className="grid gap-1">
                <div className="text-xs font-medium">User ID</div>
                <div className="font-mono text-xs break-all">{row.user_id}</div>
              </div>
              {row.user_agent ? (
                <div className="grid gap-1">
                  <div className="text-xs font-medium">User Agent</div>
                  <div className="text-xs break-all text-muted-foreground">{row.user_agent}</div>
                </div>
              ) : null}
              {row.meta ? (
                <div className="grid gap-1">
                  <div className="text-xs font-medium">Meta</div>
                  <pre className="text-xs overflow-auto rounded-md border border-border bg-muted/20 p-3 max-h-[260px]">
                    {JSON.stringify(row.meta, null, 2)}
                  </pre>
                </div>
              ) : null}
            </div>
          </DialogContent>
        </Dialog>
      </TableCell>
    </TableRow>
  );
}
