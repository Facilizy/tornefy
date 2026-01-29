import type { SupportedLanguage } from "@/i18n";

export const GOOGLE_TRANSLATE_COOKIE = "googtrans";

export const langToGoogTrans = (lang: SupportedLanguage) => {
  // Google Website Translate expects language codes like pt/en/es.
  // Our base language is PT (pt-BR).
  switch (lang) {
    case "en":
      return "/pt/en";
    case "es":
      return "/pt/es";
    case "pt-BR":
    default:
      return "/pt/pt";
  }
};

export const langToGoogleWidget = (lang: SupportedLanguage): "pt" | "en" | "es" => {
  switch (lang) {
    case "en":
      return "en";
    case "es":
      return "es";
    case "pt-BR":
    default:
      return "pt";
  }
};

export const setGoogTransCookie = (lang: SupportedLanguage) => {
  const value = langToGoogTrans(lang);
  // Set for the whole site.
  document.cookie = `${GOOGLE_TRANSLATE_COOKIE}=${value}; path=/`;
};
