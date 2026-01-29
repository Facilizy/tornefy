import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useI18n } from "@/i18n";
import { langToGoogleWidget, setGoogTransCookie } from "@/lib/google-translate";

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
  }
}

const SCRIPT_ID = "google-translate-script";
const CONTAINER_ID = "google_translate_element";

export function GoogleTranslateLoader() {
  const { language } = useI18n();
  const location = useLocation();

  const applyWidgetLanguage = (lang: "pt" | "en" | "es") => {
    const select = document.querySelector<HTMLSelectElement>(".goog-te-combo");
    if (!select) return false;
    // Even if it's already the same value, we still dispatch 'change' so Google
    // re-translates the freshly mounted DOM (SPA navigation).
    if (select.value !== lang) select.value = lang;
    select.dispatchEvent(new Event("change"));
    return true;
  };

  useEffect(() => {
    // Ensure cookie matches current language BEFORE script runs.
    setGoogTransCookie(language);

    // Hide Google UI chrome.
    const styleId = "google-translate-style";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        /* Hide Google Translate UI chrome */
        .goog-te-banner-frame,
        .goog-te-banner-frame.skiptranslate,
        .goog-te-balloon-frame,
        .goog-te-menu-frame,
        #goog-gt-tt,
        .goog-te-spinner-pos { display: none !important; }

        /* Prevent the top offset/margin Google injects */
        html { margin-top: 0 !important; top: 0 !important; }
        body { top: 0 !important; position: static !important; }
      `;
      document.head.appendChild(style);
    }

    // Create hidden container for the widget.
    if (!document.getElementById(CONTAINER_ID)) {
      const el = document.createElement("div");
      el.id = CONTAINER_ID;
      el.style.position = "fixed";
      el.style.left = "-9999px";
      el.style.top = "-9999px";
      document.body.appendChild(el);
    }

    // Init callback used by the script.
    window.googleTranslateElementInit = () => {
      const g = (window as any).google;
      if (!g?.translate?.TranslateElement) return;
      // eslint-disable-next-line new-cap
      new g.translate.TranslateElement(
        {
          pageLanguage: "pt",
          includedLanguages: "pt,en,es",
          autoDisplay: false,
        },
        CONTAINER_ID
      );
    };

    // Load script once.
    if (!document.getElementById(SCRIPT_ID)) {
      const s = document.createElement("script");
      s.id = SCRIPT_ID;
      s.async = true;
      s.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      document.head.appendChild(s);
    } else {
      // If already loaded, try to re-init (safe no-op if already initialized).
      queueMicrotask(() => window.googleTranslateElementInit?.());
    }
  }, [language]);

  // Important for SPA: when route changes, new DOM is mounted and Google doesn't automatically
  // translate it. We re-apply the selected language to the widget so it reprocesses the page.
  useEffect(() => {
    const lang = langToGoogleWidget(language);
    if (lang === "pt") return;

    let cancelled = false;
    const start = Date.now();

    const tick = () => {
      if (cancelled) return;
      // Keep cookie consistent as well.
      try {
        setGoogTransCookie(language);
      } catch {
        // ignore
      }

      if (applyWidgetLanguage(lang)) return;
      // Widget not ready yet; retry for a short window.
      if (Date.now() - start < 4000) {
        setTimeout(tick, 150);
      }
    };

    tick();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search, language]);

  return null;
}
