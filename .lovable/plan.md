
## O que você pediu (resumo)
1) Mostrar os **planos do organizador no perfil** (vitrine pública, com botão de assinar).  
2) Em **Configurações do perfil**, permitir **adicionar TorneCoins via dinheiro (R$)**, deixando claro que **1 TC = R$ 1,00**.  
3) **Sem taxa para colocar dinheiro** (sem taxa Tornefy).  
4) **Quando tirar (saque)**: mostrar que há **prazo em dias úteis** e que pode existir **taxa de processamento** (você citou Stripe).  
5) No **Admin**, criar uma área de **Financeiro completo**: transações, cards de bruto/líquido/pendente/à pagar/à receber, listas (organizadores com eventos finalizados há +30d, pedidos de antecipação, etc).

Você respondeu nas perguntas:
- **Saque**: Pix (manual)
- **Conversão**: 1 TC = R$ 1
- **Recarga**: valor livre com mínimo de **R$ 5**
- **Taxa no saque**: “Só Stripe” (vamos tratar como “taxa de processamento”, configurável; e também mostrar o prazo em dias úteis)

---

## Situação atual (o que já existe no projeto)
- Já existe o “sistema TorneCoins” no banco: `tornecoin_accounts` e `tornecoin_transactions` (+ tipos `deposit`, `fee`, `withdrawal`, etc).
- Já existe UI parcial:
  - `ProfileEdit` tem “Resumo” com `TorneCoinsSummaryCards` e “Transações” (ainda placeholder).
  - `OrganizerDashboard` já mostra `OrganizerReceivablesPanel` (saldos do organizador e últimas transações).
- Planos de assinatura já existem e já são usados em treinos (agora com múltiplos planos por treino via `training_allowed_plans` e `get_my_training_access`).
- Ainda falta a vitrine de planos em `/profile` (UserProfile).
- Ainda **não existe Stripe no código** (não há Edge Functions de checkout/verify), então precisaremos implementar a integração para recarga.

---

## Decisões de produto (como vamos fazer “do melhor jeito possível” sem complicar)
### A) Recarga de TorneCoins (R$ → TC)
- Implementar recarga via **Stripe Checkout (pagamento único)**.
- Regra: **1 TC = R$ 1,00**.
- Mínimo: **R$ 5,00**.
- “Sem taxa para colocar dinheiro”: vamos **creditar 100% dos TorneCoins** equivalentes ao valor pago (sem descontar taxa Tornefy em TC).
  - Observação importante: o Stripe sempre cobra taxa do pagamento no mundo real; mas como você quer “sem taxa no início”, a plataforma absorve isso (ou você ajusta preços depois). Na UI vamos comunicar “sem taxa Tornefy na recarga”.

### B) Saque (TC → R$ via Pix manual)
- Criar um fluxo de **pedido de saque**:
  - Usuário informa chave Pix (CPF/CNPJ/email/telefone/aleatória) + nome/CPF (opcional dependendo do seu padrão).
  - Sistema “reserva” (congela) os TorneCoins solicitados (para não gastar duas vezes).
  - Admin revisa e marca como “Pago” (você faz o Pix fora do sistema).
- Prazo: mostrar texto “Pagamento em alguns dias úteis”.
- Taxa no saque:
  - Como não há Stripe no Pix manual, vamos implementar uma **taxa de processamento configurável** (ex.: 0% por padrão) e rotular como “taxa de processamento (Stripe/operacional)”.
  - Você poderá ajustar depois sem mexer no front (guardado em tabela de config).

### C) Financeiro Admin
- Criar um novo “Financeiro” dentro do `/admin`:
  - Cards: **Bruto**, **Taxas**, **Líquido**, **Pendente a liberar**, **Solicitado para saque**, **A pagar (saques aprovados)**, **A receber (pendências)**.
  - Tabelas: transações TorneCoins, pedidos de saque, pedidos de antecipação.
  - Relatórios:
    - Organizadores com treinos/torneios **FINALIZADO há +30 dias** e que ainda têm saldo pendente/frozen relevante.
    - Organizadores com **pedido de antecipação** (fila).

---

## Implementação (por fases, com entregas claras)

### Fase 1 — Vitrine de planos no perfil do organizador (rápida e desbloqueia conversão)
**Objetivo:** quando alguém entra no `/profile/:id` de um organizador, vê os planos e pode assinar.

1) Atualizar `src/pages/UserProfile.tsx`:
- Detectar organizador (já existe).
- Buscar planos ativos do organizador:
  - `organizer_subscription_plans` (id, name, description, benefits_text, monthly_fee_coins, period_days, max_subscribers, active)
- Buscar contagem de assinantes ativos por plano:
  - `organizer_plan_memberships` com `status='active'` e `current_period_end > now()`
- Renderizar seção “Planos de assinatura” com cards:
  - Valor (TC), duração (dias), benefícios, limite/contador, e resumo “Taxa Tornefy + Líquido” por pagamento.
  - Botão “Assinar”:
    - se deslogado: CTA → /auth (com redirect de volta)
    - se logado: chama `subscribe_to_plan(planId)` e trata erros (`plan_full`, `already_active`, `insufficient_funds` etc)

**Por que primeiro:** resolve “NO PERFIL DO ORGANIZADOR NÃO APARECE OS PLANOS” e melhora conversão.

---

### Fase 2 — Recarga de TorneCoins nas Configurações do perfil (Stripe Checkout)
**Objetivo:** em `/profile/edit` permitir comprar TorneCoins com R$.

2) UI: criar/atualizar painel em `ProfileEdit`:
- Em “Resumo” (ou novo item “Adicionar TorneCoins” dentro do grupo TorneCoins) incluir:
  - Texto: “TorneCoins são vinculadas ao Real Brasileiro: **1 TC = R$ 1,00**”
  - Input valor (R$) com mínimo 5
  - Botão “Adicionar TorneCoins”
  - Mensagens:
    - “Sem taxa Tornefy na recarga.”
    - “Pagamento via Stripe.”

3) Stripe: criar Edge Functions (sem webhooks, com verificação no retorno)
- `supabase/functions/tornecoins-topup-create`:
  - autentica usuário
  - cria uma Checkout Session `mode: "payment"` em BRL
  - line item com amount custom (ou usar um Price fixo com quantity variável; como é valor livre, normalmente será `price_data`)
  - metadata: `user_id`, `coins_amount`, `kind='tornecoins_topup'`
  - success_url: `/profile/edit?topup=success&session_id={CHECKOUT_SESSION_ID}`
  - cancel_url: `/profile/edit?topup=cancel`
  - retorna `{ url }` para redirecionar

- `supabase/functions/tornecoins-topup-verify`:
  - recebe `session_id`
  - busca a sessão no Stripe e valida `payment_status='paid'`
  - garante idempotência:
    - criar tabela `tornecoin_stripe_events` (ou `tornecoin_topups`) com `stripe_session_id unique`
    - se já creditado, retorna ok sem duplicar
  - credita TorneCoins:
    - chamar SQL `public.tornecoin_credit_user(user_id, coins, 'stripe_topup', session_id, meta)`
  - registra transação com `reference_type='stripe_topup'` e `reference_id=session_id`

4) Fluxo do front:
- Ao voltar do Stripe com `?topup=success&session_id=...`, chamar verify e atualizar cards/saldo.

---

### Fase 3 — Extrato real de transações e “Minhas retiradas”
**Objetivo:** sair do placeholder e virar histórico real.

5) Substituir `src/components/profile-edit/TransactionsPanel.tsx` (hoje placeholder) por lista real:
- Filtrar por “Hoje/Ontem/Semana/Mês”
- Ler `tornecoin_transactions` vinculadas à conta do usuário (RLS já permite)
- Mostrar: data, tipo, status, valor, referência (plan, topup, entry_fee), etc.

6) Criar “Minhas retiradas”:
- Implementar componente (hoje só existe item no sidebar, mas não vi painel pronto).
- Listar `tornecoin_withdrawal_requests` do usuário.

---

### Fase 4 — Saques via Pix (manual) + pedidos de antecipação
**Objetivo:** fluxo financeiro real para organizadores e usuários.

7) Banco: novas tabelas
- `tornecoin_withdrawal_requests`:
  - id, user_id, account_id, amount_coins, fee_coins (calculado), net_coins, pix_key, pix_key_type, status (`requested|approved|paid|rejected|cancelled`), created_at, updated_at, processed_at, admin_notes
- `tornecoin_anticipation_requests` (para organizadores):
  - id, organizer_id, account_id, amount_coins, reason, status, created_at, processed_at, admin_notes

8) RPCs/SQL functions (SECURITY DEFINER)
- `request_withdrawal(amount, pix...)`:
  - valida saldo disponível
  - aplica taxa de processamento (configurável)
  - move saldo `available -> frozen` (ou `available -> pending` dependendo do modelo) para “reservar”
  - cria tx `withdrawal` (e `fee` se houver)
  - cria request

- `request_anticipation(amount, reason)`:
  - valida se organizer tem `pending` suficiente
  - cria request (não libera automaticamente; admin decide)

9) UI: ProfileEdit (organizador e usuário)
- “Minhas retiradas”: criar pedido + listar status + avisos de prazo (“alguns dias úteis”).

---

### Fase 5 — Admin Financeiro completo (cards + tabelas + relatórios)
**Objetivo:** você ter um “painel financeiro” de verdade dentro do `/admin`.

10) Edge Function `admin-api` (já existe) — adicionar endpoints:
- `GET /finance/summary`:
  - bruto (topups e entradas), taxas, líquido, saldos agregados (pending/available/frozen), saques em aberto etc.
- `GET /finance/transactions` (paginado + filtros por tipo/status/data/owner)
- `GET /finance/withdrawals` (paginado + filtros por status)
- `PATCH /finance/withdrawals/:id` para aprovar/pagar/rejeitar
- `GET /finance/anticipations` + `PATCH` para processar
- `GET /finance/organizers/stale`:
  - organizadores com treino/torneio FINALIZADO há +30 dias
  - mostrar: qtd eventos, pendente total, frozen total, último evento, etc

11) Front `/admin`:
- Novo Tab “Financeiro” com:
  - Cards (bruto/líquido/taxas/pendente/solicitado/etc)
  - Tabela de transações
  - Tabela de saques
  - Tabela de antecipações
  - Relatório “+30 dias finalizado”

---

## Arquivos e áreas que serão mexidos (visão técnica)
Frontend:
- `src/pages/UserProfile.tsx` (vitrine de planos)
- `src/pages/ProfileEdit.tsx` (entrada do painel de recarga/saque)
- `src/components/profile-edit/TransactionsPanel.tsx` (extrato real)
- Novo painel “Minhas retiradas” (provavelmente em `src/components/profile-edit/` e integrar no switch de seção do `ProfileEdit`)
- `src/pages/AdminDashboard.tsx` (nova aba Financeiro)
- `src/lib/admin-api.ts` (novas rotas)

Backend (Supabase):
- Migrações SQL (novas tabelas + RPCs)
- Edge functions:
  - `supabase/functions/tornecoins-topup-create/index.ts`
  - `supabase/functions/tornecoins-topup-verify/index.ts`
  - Expandir `supabase/functions/admin-api/index.ts`

---

## Regras de segurança/anti-fraude (importante)
- Crédito de TorneCoins só acontece após `verify` confirmar pagamento `paid` no Stripe.
- Idempotência por `stripe_session_id unique` para não duplicar crédito.
- Saque “manual Pix” sempre reserva saldo (congela) no pedido, evitando duplo gasto.
- Endpoints admin sempre via service role (já é o padrão do `admin-api`).

---

## Testes end-to-end (o que você deve validar no preview)
1) Abrir perfil de um organizador `/profile/:id` e confirmar que:
   - Planos aparecem
   - Assinar funciona (ou redireciona pra login)
2) Em `/profile/edit`:
   - Recarga mínimo R$ 5
   - Checkout abre e, ao voltar, saldo aumenta corretamente
   - Não duplica crédito ao atualizar a página de sucesso
3) Saque Pix:
   - Criar pedido, saldo fica reservado
   - Admin aprova/paga e o status muda
4) Admin Financeiro:
   - Cards batem com os valores das tabelas
   - Filtros/paginação funcionam
   - Relatório “finalizado há +30d” lista resultados coerentes

---

## Observações importantes (para alinhar expectativa)
- Como “Pix manual” não usa Stripe para o saque, a “taxa Stripe no saque” vira “taxa de processamento” configurável. Vamos deixar isso bem organizado para você decidir o percentual exato.
- Para “saque automático via Stripe” no Brasil geralmente exigiria Stripe Connect e regras extras; como você escolheu Pix manual, vamos no caminho mais simples e controlável.

