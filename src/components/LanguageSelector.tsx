import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n, type SupportedLanguage } from "@/i18n";
import { setGoogTransCookie } from "@/lib/google-translate";

const LANGS: Array<{ lang: SupportedLanguage; label: string; flag: string }> = [
  { lang: "pt-BR", label: "PT-BR", flag: "🇧🇷" },
  { lang: "en", label: "EN", flag: "🇺🇸" },
  { lang: "es", label: "ES", flag: "🇪🇸" },
];

type LanguageSelectorProps = {
  className?: string;
  value?: SupportedLanguage;
  onChange?: (lang: SupportedLanguage) => void;
  labelKey?: string;
};

export const LanguageSelector = ({
  className,
  value,
  onChange,
  labelKey = "footer.language",
}: LanguageSelectorProps) => {
  const { language: ctxLanguage, setLanguage: setCtxLanguage, t } = useI18n();

  const language = value ?? ctxLanguage;
  const setLanguage = (lang: SupportedLanguage) => {
    onChange?.(lang);
    if (!onChange) setCtxLanguage(lang);

    // Force full-page translation (Google Website Translate reads the cookie).
    try {
      setGoogTransCookie(lang);
      // Prevent infinite reload loops (only for this navigation).
      const key = "gt_reload_lang";
      const previous = sessionStorage.getItem(key);
      if (previous !== lang) {
        sessionStorage.setItem(key, lang);
        window.location.reload();
      }
    } catch {
      // ignore
    }
  };

  const current = LANGS.find((l) => l.lang === language) ?? LANGS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={
            "h-9 gap-2 rounded-lg border-border bg-background/40 hover:bg-background/60 " +
            (className ?? "")
          }
        >
          <span aria-hidden className="text-base leading-none">
            {current.flag}
          </span>
          <span className="text-xs font-semibold tracking-wide">{current.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>{t(labelKey)}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LANGS.map((l) => (
          <DropdownMenuItem
            key={l.lang}
            onClick={() => setLanguage(l.lang)}
            className={language === l.lang ? "bg-muted" : undefined}
          >
            <span className="mr-2" aria-hidden>
              {l.flag}
            </span>
            {l.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
