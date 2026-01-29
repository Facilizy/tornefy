
Objetivo
- Definir quais vídeos tutoriais curtos você deve gravar (foco Jogador + Organizador).
- Trocar o sistema de idioma para um “tradutor automático estilo Google/AI”, onde ao mudar o idioma, a plataforma inteira muda junto (prioridade: rápido).

1) Lista de vídeos tutoriais curtos (roteiro sugerido)
Formato recomendado
- Duração: 30–60s (até 90s quando precisar)
- Estrutura: Problema → Onde clicar → Resultado → “Dica rápida”
- Gravar em 1080p, cursor visível, zoom leve nos cliques, legenda curta.

A. Tutoriais para Jogadores (essenciais)
1. “Como criar conta e entrar (login)”
   - Mostrar /auth, criar conta, confirmar e entrar.
2. “Como achar uma scrim e se inscrever”
   - Entrar em /scrims, escolher scrim, ver detalhes, confirmar.
3. “Como ver e aceitar convites de equipe”
   - Ir em /invites, aceitar/rejeitar, confirmar que mudou na equipe.
4. “Como ver notificações e marcar como lidas”
   - /notificacoes, filtros, marcar como lida, limpar lidas.
5. “Como editar perfil (nickname, redes, idioma)”
   - /profile/edit: username, redes, preferred games, idioma.

B. Tutoriais para Organizadores (essenciais)
1. “Como criar/organizar uma scrim”
   - Fluxo principal do painel do organizador (onde cria/edita treino).
2. “Como configurar pontuação / partidas / rodadas”
   - Mostrar telas de scoring/score management (o básico que impacta o evento).
3. “Como convidar equipes e gerenciar lista”
   - Convites enviados, pendentes, reenviar, cancelar.
4. “Como acompanhar resultados / ranking do treino”
   - Onde vê placar, status, tabela geral.
5. “Como usar overlays no OBS (tabela/mvp/rodada/queda)”
   - Acessar rotas de overlay e colocar no OBS (browser source).

C. Tutoriais “de apoio” (curtos e muito úteis)
1. “Como usar a Tornefy Secure (anti-cheat) na scrim”
   - Entrar na landing /anti-hack, baixar Windows, o que acontece depois.
2. “FAQ: principais dúvidas em 30s”
   - “Posso participar sem equipe?”, “Como recebo convite?”, “Como ligo Twitch?”, etc.

Entrega prática (o que vou te devolver dentro do app, se você quiser)
- Uma página/aba “Tutoriais” (ou no /faq) com cards de vídeo, miniatura e progresso (você já tem um player YouTube com tracking: `YouTubeTutorialPlayer.tsx`), então dá para montar uma área de “trilha” bem rápido.

2) Idioma automático “tipo Google” para a plataforma inteira (rápido)
Estado atual do projeto (o que encontrei)
- Já existe um sistema de i18n próprio: `src/i18n/index.tsx` + `LanguageSelector`.
- Porém ele só traduz algumas chaves (nav/footer/404/auth) e a maioria das telas está com texto fixo em PT-BR.
- Ou seja: hoje, trocar idioma NÃO traduz “a plataforma inteira”.

O que você pediu
- “Nosso tradutor ser o do google ou outro, que ao trocar de idioma já trocar o da plataforma inteira”
- Preferência: Automática (Google/AI) e prioridade “Rápido”.

Solução recomendada para ficar pronto rápido (Google Translate Website)
- Implementar o Google Website Translator (não precisa API key).
- Ele traduz o DOM inteiro (inclusive textos que hoje estão hardcoded).
- Integrar o seletor (PT-BR/EN/ES) para “forçar” a troca de idioma da página toda.

Como vamos implementar (passo a passo)
A) Adicionar o carregamento do Google Translate
- Incluir o script do Google Translate no `index.html` e inicializar o widget.
- Criar um “loader” React (ex.: `GoogleTranslateLoader`) para garantir:
  - o script carrega 1 vez
  - existe um container “oculto” para o widget (para não poluir o layout)
  - a função global de init fica consistente

B) Fazer o LanguageSelector controlar o idioma global
- Quando o usuário escolher EN/ES/PT-BR:
  - setar o cookie `googtrans` para o par correto (ex.: `/pt/pt`, `/pt/en`, `/pt/es`)
  - recarregar a página (ou disparar refresh do translate) para aplicar em tudo
- Manter `localStorage` (o que você já tem) como “idioma preferido”.
- Manter também o `document.documentElement.lang`.

C) Decidir convivência com o i18n atual
Como fica mais rápido:
- Continuar com o i18n atual para nav/footer/algumas labels (ok).
- E deixar o Google Translate cuidar do resto (o “inteiro” da plataforma).
Observação importante:
- Pode acontecer “dupla tradução” em alguns trechos (raramente) dependendo de como o texto é renderizado. Vamos testar e, se necessário, desativar o `t()` em partes específicas ou ajustar o init para minimizar isso.

D) Persistência por usuário (já existe)
- Hoje você já salva `preferred_language` no `profiles` e o app hidrata isso no login.
- A gente só adapta para o novo mecanismo: ao entrar/logar, aplicar automaticamente o idioma do perfil via cookie do Google Translate.

3) Testes que vamos fazer (para garantir que não quebra nada)
- Trocar idioma pelo selector e validar que:
  - Home, Scrims, Profile, Dashboard, Organizer, FAQ, Notificações mudam o texto.
- Testar rotas críticas:
  - /auth, /profile/edit, /training/:id, /organizer, /notificacoes, /anti-hack
- Testar no mobile (menu Sheet) e desktop (header normal).
- Conferir se inputs/formulários continuam utilizáveis (translate às vezes tenta mexer em placeholders).

4) Limitações (pra você estar ciente)
- Google Website Translate não é perfeito:
  - qualidade varia, pode traduzir termos de esports de forma estranha
  - pode impactar levemente performance
  - não é o melhor para SEO (a tradução é client-side)
- Como você disse que quer “rápido”, ele é o caminho mais direto para “traduzir tudo” agora.
- Se depois você quiser “qualidade máxima”, a evolução natural é:
  - migrar telas para chaves de i18n (manual) e/ou
  - usar tradução automática (AI) só para preencher chaves faltantes no backoffice.

5) Escopo de implementação no código (resumo técnico)
Arquivos que provavelmente serão alterados
- `index.html` (script do Google Translate)
- `src/components/LanguageSelector.tsx` (acionar idioma global)
- `src/i18n/index.tsx` (ajuste para não conflitar e para aplicar cookie quando logar)
- Possível: `src/App.tsx` ou `src/main.tsx` (inserir loader/initializer global)

O que não vai ser necessário (nesta fase rápida)
- Traduzir manualmente todas as páginas uma a uma
- Criar banco de traduções
- Configurar API key do Google Cloud Translation

Critérios de pronto
- Trocar para EN/ES/PT-BR e ver a maior parte dos textos da plataforma mudando imediatamente, sem precisar reescrever as páginas.
- Preferência salva (local + perfil) funcionando: o usuário volta e já abre no idioma escolhido.
