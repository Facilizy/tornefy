import type { SupportedLanguage } from "@/i18n";

export type FaqTopic =
  | "getting-started"
  | "teams"
  | "scrims"
  | "scoring"
  | "ranking"
  | "organizer";

export type FaqAudience = "player" | "organizer";

export type FaqItem = {
  id: string;
  audience: FaqAudience;
  topic: FaqTopic;
  question: string;
  answer: string;
  keywords: string[];
};

export type VideoItem = {
  id: string;
  audience: FaqAudience;
  topic: FaqTopic;
  title: string;
  description: string;
  youtubeId: string;
  durationSeconds: number;
};

export type FaqCopy = {
  pageTitle: string;
  heroTitle: string;
  heroSubtitle: string;
  searchLabel: string;
  searchPlaceholderText: string;
  searchPlaceholderVideos: string;
  viewText: string;
  viewVideos: string;
  audienceAll: string;
  audiencePlayer: string;
  audienceOrganizer: string;
  noResultsText: string;
  ctaScrims: string;
  ctaMyTeam: string;
  ctaOrganizer: string;
  topicsLabel: string;
  topicAll: string;
  topics: Record<FaqTopic, string>;
};

const COPY: Record<SupportedLanguage, FaqCopy> = {
  "pt-BR": {
    pageTitle: "FAQ • Tornefy",
    heroTitle: "FAQ & Tutoriais",
    heroSubtitle: "Encontre respostas rápidas por tópico, com busca e vídeos.",
    searchLabel: "Buscar",
    searchPlaceholderText: "Digite uma palavra-chave (ex.: check-in, TAG, ranking)...",
    searchPlaceholderVideos: "Buscar vídeos...",
    viewText: "Texto",
    viewVideos: "Vídeos",
    audienceAll: "Todos",
    audiencePlayer: "Jogador",
    audienceOrganizer: "Organizador",
    noResultsText: "Nenhum resultado. Tente outra palavra ou ajuste os filtros.",
    ctaScrims: "Ver scrims",
    ctaMyTeam: "Minha equipe",
    ctaOrganizer: "Painel do organizador",
    topicsLabel: "Tópicos",
    topicAll: "Tudo",
    topics: {
      "getting-started": "Começando",
      teams: "Equipes",
      scrims: "Scrims",
      scoring: "Pontuação",
      ranking: "Ranking",
      organizer: "Organização",
    },
  },
  en: {
    pageTitle: "FAQ • Tornefy",
    heroTitle: "FAQ & Tutorials",
    heroSubtitle: "Find quick answers by topic, with search and videos.",
    searchLabel: "Search",
    searchPlaceholderText: "Type a keyword (e.g., check-in, tag, ranking)...",
    searchPlaceholderVideos: "Search videos...",
    viewText: "Text",
    viewVideos: "Videos",
    audienceAll: "All",
    audiencePlayer: "Player",
    audienceOrganizer: "Organizer",
    noResultsText: "No results. Try another search or adjust filters.",
    ctaScrims: "Browse scrims",
    ctaMyTeam: "My team",
    ctaOrganizer: "Organizer panel",
    topicsLabel: "Topics",
    topicAll: "All",
    topics: {
      "getting-started": "Getting started",
      teams: "Teams",
      scrims: "Scrims",
      scoring: "Scoring",
      ranking: "Ranking",
      organizer: "Organizing",
    },
  },
  es: {
    pageTitle: "FAQ • Tornefy",
    heroTitle: "FAQ y Tutoriales",
    heroSubtitle: "Encuentra respuestas rápidas por tema, con búsqueda y videos.",
    searchLabel: "Buscar",
    searchPlaceholderText: "Escribe una palabra clave (ej.: check-in, tag, ranking)...",
    searchPlaceholderVideos: "Buscar videos...",
    viewText: "Texto",
    viewVideos: "Videos",
    audienceAll: "Todos",
    audiencePlayer: "Jugador",
    audienceOrganizer: "Organizador",
    noResultsText: "Sin resultados. Prueba otra búsqueda o ajusta los filtros.",
    ctaScrims: "Ver scrims",
    ctaMyTeam: "Mi equipo",
    ctaOrganizer: "Panel del organizador",
    topicsLabel: "Temas",
    topicAll: "Todo",
    topics: {
      "getting-started": "Empezar",
      teams: "Equipos",
      scrims: "Scrims",
      scoring: "Puntuación",
      ranking: "Ranking",
      organizer: "Organización",
    },
  },
};

const FAQ_BY_LANG: Record<SupportedLanguage, FaqItem[]> = {
  "pt-BR": [
    {
      id: "criar-time",
      audience: "player",
      topic: "teams",
      question: "Como criar uma equipe?",
      answer:
        "Vá em Minha Equipe → Criar equipe. Escolha nome e TAG. Depois adicione seus jogadores (line/main/reserva) e salve. Sua TAG é usada para inscrições e convites.",
      keywords: ["equipe", "time", "criar", "tag", "roster"],
    },
    {
      id: "participar-scrim",
      audience: "player",
      topic: "scrims",
      question: "Como participar de uma scrim/treino?",
      answer:
        "Abra a página de Scrims, escolha um treino e clique em Inscrever. Se o treino for privado, sua TAG precisa estar na lista de convidados. Em alguns modos, sua equipe precisa ter o mínimo de jogadores cadastrado.",
      keywords: ["scrim", "treino", "inscrição", "inscrever", "privado", "convidados"],
    },
    {
      id: "checkin",
      audience: "player",
      topic: "scrims",
      question: "O que é check-in e como funciona?",
      answer:
        "Alguns treinos exigem check-in perto do horário. Quando disponível, um admin da equipe pode confirmar presença dentro da página do treino. Sem check-in, a equipe pode perder a vaga.",
      keywords: ["check-in", "checkin", "vaga", "admin"],
    },
    {
      id: "pontuacao",
      audience: "player",
      topic: "scoring",
      question: "Como funciona a pontuação?",
      answer:
        "A pontuação depende das configurações do treino (pontos por kill e por colocação). No detalhe do treino, abra a seção de Regras/Pontuação para ver exatamente o método daquele evento.",
      keywords: ["pontuação", "kills", "colocação", "regras"],
    },
    {
      id: "ranking",
      audience: "player",
      topic: "ranking",
      question: "Como funciona o ranking de jogadores?",
      answer:
        "O ranking soma pontos por temporada e por jogo. Você pode alternar jogo/temporada no ranking e no seu perfil. Patentes (Bronze → Triunfante) dependem de pontos e regra de corte.",
      keywords: ["ranking", "temporada", "patente", "triunfante", "pontos"],
    },
    {
      id: "criar-scrim",
      audience: "organizer",
      topic: "organizer",
      question: "Como criar uma scrim/treino como organizador?",
      answer:
        "Acesse Painel do Organizador → Criar Treino. Defina jogo, data/hora, modo, limite de vagas, links (Discord/WhatsApp) e regras. Você pode editar o treino depois pelo painel.",
      keywords: ["organizador", "criar", "treino", "scrim", "painel"],
    },
  ],
  en: [
    {
      id: "criar-time",
      audience: "player",
      topic: "teams",
      question: "How do I create a team?",
      answer:
        "Go to My Team → Create team. Choose a name and TAG. Then add your players (line/main/reserve) and save. Your TAG is used for registrations and invites.",
      keywords: ["team", "create", "tag", "roster"],
    },
    {
      id: "participar-scrim",
      audience: "player",
      topic: "scrims",
      question: "How do I join a scrim/training?",
      answer:
        "Open the Scrims page, pick a training and click Register. If it’s private, your TAG must be on the invite list. In some modes, your team must have the minimum number of players.",
      keywords: ["scrim", "training", "register", "private", "invites"],
    },
    {
      id: "checkin",
      audience: "player",
      topic: "scrims",
      question: "What is check-in and how does it work?",
      answer:
        "Some trainings require check-in close to the start time. When available, a team admin can confirm attendance inside the training page. Without check-in, the team may lose the slot.",
      keywords: ["check-in", "slot", "admin"],
    },
    {
      id: "pontuacao",
      audience: "player",
      topic: "scoring",
      question: "How does scoring work?",
      answer:
        "Scoring depends on the training settings (points per kill and placement). On the training details page, open Rules/Scoring to see the exact method for that event.",
      keywords: ["scoring", "kills", "placement", "rules"],
    },
    {
      id: "ranking",
      audience: "player",
      topic: "ranking",
      question: "How does the player ranking work?",
      answer:
        "The ranking adds points per season and per game. You can switch game/season on the ranking page and on your profile. Ranks (Bronze → Triumphant) depend on points and cut rules.",
      keywords: ["ranking", "season", "rank", "points"],
    },
    {
      id: "criar-scrim",
      audience: "organizer",
      topic: "organizer",
      question: "How do I create a scrim/training as an organizer?",
      answer:
        "Go to Organizer Dashboard → Create Training. Set game, date/time, mode, slot limit, links (Discord/WhatsApp) and rules. You can edit the training later from the dashboard.",
      keywords: ["organizer", "create", "training", "scrim", "dashboard"],
    },
  ],
  es: [
    {
      id: "criar-time",
      audience: "player",
      topic: "teams",
      question: "¿Cómo creo un equipo?",
      answer:
        "Ve a Mi equipo → Crear equipo. Elige nombre y TAG. Luego agrega tus jugadores (line/main/reserva) y guarda. Tu TAG se usa para inscripciones e invitaciones.",
      keywords: ["equipo", "crear", "tag", "roster"],
    },
    {
      id: "participar-scrim",
      audience: "player",
      topic: "scrims",
      question: "¿Cómo participo en una scrim/entrenamiento?",
      answer:
        "Abre la página de Scrims, elige un entrenamiento y haz clic en Inscribirse. Si es privado, tu TAG debe estar en la lista de invitados. En algunos modos, tu equipo debe tener el mínimo de jugadores.",
      keywords: ["scrim", "entrenamiento", "inscripción", "privado", "invitados"],
    },
    {
      id: "checkin",
      audience: "player",
      topic: "scrims",
      question: "¿Qué es el check-in y cómo funciona?",
      answer:
        "Algunos entrenamientos requieren check-in cerca del horario. Cuando está disponible, un admin del equipo puede confirmar la presencia dentro de la página del entrenamiento. Sin check-in, el equipo puede perder la plaza.",
      keywords: ["check-in", "plaza", "admin"],
    },
    {
      id: "pontuacao",
      audience: "player",
      topic: "scoring",
      question: "¿Cómo funciona la puntuación?",
      answer:
        "La puntuación depende de la configuración del entrenamiento (puntos por kill y por posición). En los detalles del entrenamiento, abre Reglas/Puntuación para ver el método exacto del evento.",
      keywords: ["puntuación", "kills", "posición", "reglas"],
    },
    {
      id: "ranking",
      audience: "player",
      topic: "ranking",
      question: "¿Cómo funciona el ranking de jugadores?",
      answer:
        "El ranking suma puntos por temporada y por juego. Puedes cambiar juego/temporada en el ranking y en tu perfil. Los rangos (Bronce → Triunfante) dependen de los puntos y reglas de corte.",
      keywords: ["ranking", "temporada", "rango", "puntos"],
    },
    {
      id: "criar-scrim",
      audience: "organizer",
      topic: "organizer",
      question: "¿Cómo creo una scrim/entrenamiento como organizador?",
      answer:
        "Ve al Panel del organizador → Crear entrenamiento. Define juego, fecha/hora, modo, límite de plazas, enlaces (Discord/WhatsApp) y reglas. Puedes editar el entrenamiento después desde el panel.",
      keywords: ["organizador", "crear", "entrenamiento", "scrim", "panel"],
    },
  ],
};

const VIDEOS_BY_LANG: Record<SupportedLanguage, VideoItem[]> = {
  "pt-BR": [
    {
      id: "intro-player",
      audience: "player",
      topic: "getting-started",
      title: "Introdução para Jogadores",
      description: "Aprenda a navegar pela plataforma como jogador e criar sua equipe.",
      youtubeId: "MFMhoNtTSdk",
      durationSeconds: 300,
    },
    {
      id: "intro-organizer",
      audience: "organizer",
      topic: "organizer",
      title: "Introdução para Organizadores",
      description: "Saiba como criar e gerenciar treinos na plataforma.",
      youtubeId: "MFMhoNtTSdk",
      durationSeconds: 300,
    },
  ],
  en: [
    {
      id: "intro-player",
      audience: "player",
      topic: "getting-started",
      title: "Getting started for Players",
      description: "Learn how to navigate the platform and create your team.",
      youtubeId: "MFMhoNtTSdk",
      durationSeconds: 300,
    },
    {
      id: "intro-organizer",
      audience: "organizer",
      topic: "organizer",
      title: "Getting started for Organizers",
      description: "Learn how to create and manage trainings on the platform.",
      youtubeId: "MFMhoNtTSdk",
      durationSeconds: 300,
    },
  ],
  es: [
    {
      id: "intro-player",
      audience: "player",
      topic: "getting-started",
      title: "Introducción para Jugadores",
      description: "Aprende a navegar la plataforma y crear tu equipo.",
      youtubeId: "MFMhoNtTSdk",
      durationSeconds: 300,
    },
    {
      id: "intro-organizer",
      audience: "organizer",
      topic: "organizer",
      title: "Introducción para Organizadores",
      description: "Aprende a crear y gestionar entrenamientos en la plataforma.",
      youtubeId: "MFMhoNtTSdk",
      durationSeconds: 300,
    },
  ],
};

export function getFaqContent(language: SupportedLanguage) {
  const copy = COPY[language] || COPY["pt-BR"];
  return {
    copy,
    items: FAQ_BY_LANG[language] || FAQ_BY_LANG["pt-BR"],
    videos: VIDEOS_BY_LANG[language] || VIDEOS_BY_LANG["pt-BR"],
  };
}
