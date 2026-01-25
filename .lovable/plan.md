
Objetivo
- Criar uma “Dashboard Admin” (/admin) para controle geral da plataforma, com edição de dados via tela (treinos, equipes, usuários e verificações), com segurança forte no servidor (Edge Functions + SERVICE_ROLE), e suporte a múltiplos admins.

O que já existe e vamos reaproveitar
- Autenticação via Supabase e tabela public.user_roles (string) já usada no app.
- Hook src/hooks/useUserRole.ts hoje retorna “player | organizer” e identifica “organizer_verified” como organizer.
- Padrão de Edge Functions já existente usando SUPABASE_SERVICE_ROLE_KEY (ex: supabase/functions/update-achievements/index.ts).
- Layout e componentes UI (Dialog, Table, Button etc.) já disponíveis.

Decisões-chave (segurança e arquitetura)
1) Segurança (obrigatório)
- Nenhuma operação “admin” será feita diretamente pelo client via supabase.from(...).update/delete em tabelas sensíveis.
- Toda edição admin passará por uma Edge Function (service role) que:
  a) Valida o usuário logado pelo JWT (Authorization header)
  b) Checa no banco (com service role) se o usuário tem role “admin” em public.user_roles
  c) Só então executa a ação solicitada
- Isso evita escalonamento por manipulação client-side e dribla limitações/complexidade de RLS para telas administrativas.

2) “Bootstrap” de admins (múltiplos admins)
- Como a tela de admin precisa existir antes de poder “criar outros admins”, o primeiro admin deve ser definido manualmente uma única vez (via SQL Editor do Supabase) inserindo role='admin' em user_roles para o seu user_id.
- Depois disso, podemos implementar dentro do próprio /admin uma área “Admins” (opcional) para adicionar/remover admins com segurança via Edge Function.

3) Compatibilidade com telas existentes
- OrganizerDashboard hoje bloqueia acesso se role !== "organizer". Vamos ajustar para permitir também “admin”, assim admin consegue acessar tudo sem fricção.
- Menus (MainLayout) vão exibir o item “Admin” somente para quem for admin.

Escopo da Dashboard Admin (MVP)
A) Visão Geral (Stats)
- Cards com métricas: total de usuários, total de equipes, total de treinos, inscrições, convites pendentes etc. (o que for rápido e útil).
- Últimas atividades (opcional): últimos treinos criados/atualizados, últimos usuários criados (se houver timestamps disponíveis).

B) Treinos (CRUD controlado)
- Tabela com busca e filtros (status/jogo/plataforma/data).
- Ações:
  - Editar (modal): campos essenciais (nome, data/hora, status, max_slots, is_private, links, banner_url/table_image_url se necessário).
  - Excluir (confirmação).
  - Atalhos: “Abrir treino” (link para /training/:id), “Ir para painel organizador do criador” (se fizer sentido).

C) Equipes
- Tabela com busca por nome/tag/dono.
- Ações:
  - Editar (modal): nome, tag, logo/banner, owner_id (com muito cuidado), e eventualmente status/flags.
  - Ver membros (modal): leitura (e edição futura se você quiser).

D) Usuários (profiles)
- Tabela com busca por username/nome/id.
- Ações:
  - Editar (modal): full_name, username, avatar_url, preferred_games, etc.
  - Abrir perfil público (/profile/:userId)
  - (Opcional, se existir tabela de blacklist/ban) ban/blacklist pela tela.

E) Verificações
- Lista e busca por entity_type (user/team/organizer se aplicável) e entity_id.
- Ações:
  - Marcar como verificado / remover verificação (upsert/update em verified_entities).
- Observação: vocês já tornaram “verificação pública” via view verified_entities_public e RPCs públicos. A gestão (escrita) continuará restrita ao admin via Edge Function.

Mudanças necessárias no banco (via migration)
- Como user_roles.role é string, não precisa alterar schema para permitir “admin”.
- Porém, precisamos garantir que:
  1) O app não dependa de “única role por usuário” de forma perigosa.
  2) A verificação “admin” seja consistente.
- Plano de migration (se necessário após conferirmos constraints atuais):
  - Criar função SECURITY DEFINER para checagem de admin (opcional, mas útil):
    - public.is_admin(_user_id text) returns boolean
  - (Opcional) Criar função has_role(_user_id text, _role text) para generalizar.
  - Não vamos abrir SELECT em user_roles para visitantes; a Edge Function faz a checagem com service key.
Nota: antes de executar migration, vou inspecionar a migration/constraints existentes (principalmente se existe unique(user_id)) para entender como o sistema de roles está se comportando hoje.

Edge Function: “admin-api” (novo)
- Nome sugerido: supabase/functions/admin-api/index.ts
- Responsabilidades:
  1) CORS + OPTIONS
  2) Autenticar o request:
     - Criar client “anon” com header Authorization e chamar supabase.auth.getUser() para obter user_id com segurança.
  3) Autorizar:
     - Com client service-role, consultar public.user_roles onde user_id = uid e role = 'admin'
     - Se não for admin, retornar 403
  4) Roteamento simples por path + method (exemplos):
     - GET    /admin-api/stats
     - GET    /admin-api/trainings?search=&status=&game=&from=&to=
     - PATCH  /admin-api/trainings/:id
     - DELETE /admin-api/trainings/:id
     - GET    /admin-api/teams?search=
     - PATCH  /admin-api/teams/:id
     - GET    /admin-api/users?search=
     - PATCH  /admin-api/users/:id
     - POST   /admin-api/verifications (set/unset)
- Validação:
  - Validar payloads (campos permitidos) para não aceitar “update” de colunas sensíveis sem querer.
  - Limitar paginação (limit/offset) para performance.

Frontend: Nova página /admin
- Criar src/pages/AdminDashboard.tsx (layout semelhante ao OrganizerDashboard):
  - Cabeçalho + Tabs: “Visão Geral”, “Treinos”, “Equipes”, “Usuários”, “Verificações”
  - Cada Tab:
    - Barra de busca
    - Tabela
    - Botões “Editar” (modal), “Excluir” (onde fizer sentido)
- Integração de dados:
  - Usar @tanstack/react-query para caching e invalidations após salvar/excluir.
  - Chamadas:
    - Preferencial: supabase.functions.invoke("admin-api", { body }) se vocês já usam invoke em algum ponto.
    - Alternativa: fetch direto no endpoint da function (com Authorization), mas manteremos o padrão mais consistente com o projeto.

Controle de acesso no app (UI + rota)
1) Atualizar src/hooks/useUserRole.ts
- Incluir “admin” no tipo e na lógica:
  - roles inclui "admin" => role = "admin"
  - (e opcionalmente: tratar admin como organizer também quando necessário)

2) Ajustar guards existentes
- src/pages/OrganizerDashboard.tsx:
  - Permitir role === "organizer" OR role === "admin"
- Criar guard no AdminDashboard:
  - Se roleLoading => aguarda
  - Se não logado => /auth
  - Se role !== "admin" => toast + redirect /

3) Navegação
- src/components/MainLayout.tsx:
  - Adicionar item no menu (desktop + mobile) “Admin” visível apenas para admins.

Passo a passo de implementação (sequência)
1) Auditoria rápida (read)
- Conferir no código e schema como user_roles está sendo usado (se há unique(user_id), como handle_new_user funciona, e se existe algum lugar assumindo apenas player/organizer).
- Confirmar tabelas envolvidas no admin (profiles, teams, trainings, verified_entities, etc.) e colunas essenciais para edição.

2) Banco (se necessário)
- Criar migration com função(is) auxiliares (ex: is_admin/has_role) apenas se realmente ajudar.
- Não abrir leitura pública de user_roles.
- (Sem seed de dados via migration; o primeiro admin será inserido manualmente via SQL Editor.)

3) Edge Function admin-api
- Implementar CORS + autenticação + autorização.
- Implementar endpoints MVP:
  - stats
  - trainings list + update + delete
  - teams list + update
  - users list + update
  - verifications set/unset
- Logar erros com contexto para facilitar debug no Supabase logs.

4) Frontend /admin
- Criar AdminDashboard com tabs e tabelas.
- Criar modais de edição (form simples, com validações básicas e feedback via toast).
- Integrar com React Query (invalidate queries após update/delete).

5) Ajustes de acesso e navegação
- Expandir useUserRole para admin.
- Ajustar OrganizerDashboard para aceitar admin.
- Adicionar menu Admin.

6) QA / validações
- Testar:
  - Usuário não logado acessando /admin (deve mandar para /auth)
  - Usuário logado sem admin (403 e redirect)
  - Admin: listar e editar com sucesso
  - Campos de data/hora (timezone) no update de trainings (o app já tem cuidado com datetime-local, vamos manter consistência)
- Se aparecerem erros de CORS/Authorization, validar headers e formato do invoke.

O que vou precisar de você (apenas 2 coisas)
1) Quem será o primeiro admin?
- Assim que a tela existir, você precisa me dizer qual conta (e-mail) é a sua (ou mandar o user_id). Aí eu te passo um SQL “copy/paste” para inserir role='admin' para esse user_id.
2) Regras de edição “sensíveis”
- Confirmar se você quer que o admin possa:
  - Trocar owner_id de equipe (sim/não)
  - Excluir treinos e equipes (sim/não)
  - Editar username de usuários (sim/não)
Se você não responder isso agora, eu implemento com defaults conservadores (sem owner_id por padrão; excluir com confirmação; username editável apenas se você pedir).

Entregável final (MVP)
- /admin funcional, seguro, com:
  - Métricas gerais
  - Gestão de Treinos, Equipes, Usuários e Verificações via modais
  - Acesso restrito por role “admin” validado no servidor (Edge Function)
  - Item de menu “Admin” aparecendo apenas para admins
