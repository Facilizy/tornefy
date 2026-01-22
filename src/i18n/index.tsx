import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SupportedLanguage = "pt-BR" | "en" | "es";

type Dict = Record<string, string>;

const STORAGE_KEY = "tornefy_lang";

const dictionaries: Record<SupportedLanguage, Dict> = {
  "pt-BR": {
    "nav.home": "Home",
    "nav.scrims": "Scrims",
    "nav.players": "Ranking",
    "nav.teams": "Equipes",
    "nav.terms": "Termos de Uso",
    "nav.privacy": "Política de Privacidade",

    "auth.login": "Entrar",
    "auth.signup": "Criar Conta",

    "footer.about":
      "Plataforma de scrims competitivas para esports. Participe das melhores scrims e evolua com a comunidade.",
    "footer.links": "Links",
    "footer.social": "Social",
    "footer.language": "Idioma",

    "404.title": "Página não encontrada",
    "404.subtitle": "A rota acessada não existe ou foi movida.",
    "404.back": "Voltar",
    "404.goHome": "Ir para Home",
    "404.quickLinks": "Links rápidos",
  },
  en: {
    "nav.home": "Home",
    "nav.scrims": "Scrims",
    "nav.players": "Ranking",
    "nav.teams": "Teams",
    "nav.terms": "Terms of Use",
    "nav.privacy": "Privacy Policy",

    "auth.login": "Sign in",
    "auth.signup": "Sign up",

    "footer.about":
      "Competitive scrims platform for esports. Join the best scrims and improve with the community.",
    "footer.links": "Links",
    "footer.social": "Social",
    "footer.language": "Language",

    "404.title": "Page not found",
    "404.subtitle": "The page you tried to access doesn't exist or was moved.",
    "404.back": "Go back",
    "404.goHome": "Go to Home",
    "404.quickLinks": "Quick links",
  },
  es: {
    "nav.home": "Inicio",
    "nav.scrims": "Scrims",
    "nav.players": "Ranking",
    "nav.teams": "Equipos",
    "nav.terms": "Términos de uso",
    "nav.privacy": "Política de privacidad",

    "auth.login": "Iniciar sesión",
    "auth.signup": "Crear cuenta",

    "footer.about":
      "Plataforma de scrims competitivas para esports. Únete a las mejores scrims y mejora con la comunidad.",
    "footer.links": "Enlaces",
    "footer.social": "Social",
    "footer.language": "Idioma",

    "404.title": "Página no encontrada",
    "404.subtitle": "La ruta a la que intentaste acceder no existe o fue movida.",
    "404.back": "Volver",
    "404.goHome": "Ir al inicio",
    "404.quickLinks": "Enlaces rápidos",
  },
};

type I18nContextValue = {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

const normalizeLang = (value: string | null | undefined): SupportedLanguage => {
  if (value === "pt-BR" || value === "en" || value === "es") return value;
  return "pt-BR";
};

export const I18nProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    const stored = normalizeLang(localStorage.getItem(STORAGE_KEY));
    if (stored) return stored;
    const browser = normalizeLang(navigator.language);
    return browser;
  });

  const [userId, setUserId] = useState<string | null>(null);
  const isHydratingRef = useRef(false);

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  // When logged in, profile language has priority.
  useEffect(() => {
    const applyProfileLanguage = async (uid: string) => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("preferred_language")
          .eq("id", uid)
          .maybeSingle();
        if (error) throw error;

        const preferred = normalizeLang((data as any)?.preferred_language);
        // Only override if profile explicitly has a value (column has default; treat it as explicit).
        if (preferred) {
          isHydratingRef.current = true;
          setLanguage(preferred);
          // allow next tick so persistence effect doesn't immediately re-trigger during hydration
          queueMicrotask(() => {
            isHydratingRef.current = false;
          });
        }
      } catch {
        // ignore
      }
    };

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (uid) await applyProfileLanguage(uid);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (uid) void applyProfileLanguage(uid);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  // Persist language into the profile.
  useEffect(() => {
    if (!userId) return;
    if (isHydratingRef.current) return;

    void supabase
      .from("profiles")
      .update({ preferred_language: language } as any)
      .eq("id", userId);
  }, [language, userId]);

  const value = useMemo<I18nContextValue>(() => {
    const t = (key: string) => {
      const dict = dictionaries[language] || dictionaries["pt-BR"];
      return dict[key] ?? dictionaries["pt-BR"][key] ?? key;
    };
    return { language, setLanguage, t };
  }, [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
};
