import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useTheme, type Theme } from "@/lib/theme";
import { SUPPORTED_LANGS } from "@/lib/i18n";
import { Moon, Sun, ScrollText, Globe, Palette } from "lucide-react";

export function Header() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();

  const changeLang = (code: string) => {
    void i18n.changeLanguage(code);
    const lang = SUPPORTED_LANGS.find((l) => l.code === code);
    if (lang && typeof document !== "undefined") {
      document.documentElement.dir = lang.dir;
      document.documentElement.lang = code;
    }
  };

  const themes: { key: Theme; icon: React.ReactNode; label: string }[] = [
    { key: "cyber", icon: <Moon className="h-4 w-4" />, label: t("theme.cyber") },
    { key: "sepia", icon: <ScrollText className="h-4 w-4" />, label: t("theme.papyrus") },
    { key: "marble", icon: <Sun className="h-4 w-4" />, label: t("theme.marble") },
  ];

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/75 border-b border-gold/20">
      <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between gap-4">
        <Link to="/" className="group flex items-center gap-3">
          <div className="relative">
            <div className="h-9 w-9 rotate-45 border-2 border-gold/70 group-hover:border-gold transition-colors" />
            <div className="absolute inset-0 flex items-center justify-center font-display text-gold text-lg">✦</div>
          </div>
          <div>
            <div className="font-display text-xl leading-none gradient-gold-text font-semibold">
              {t("brand")}
            </div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mt-0.5 hidden sm:block">
              {t("hero.eyebrow")}
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <Link to="/admin" className="hidden sm:inline-flex text-xs uppercase tracking-widest text-muted-foreground hover:text-gold transition-colors px-3 py-2">
            {t("nav.admin")}
          </Link>

          <div className="flex items-center gap-1 rounded-full border border-gold/30 p-1 bg-card/50">
            <Palette className="h-3.5 w-3.5 text-gold/70 mx-1.5" aria-hidden />
            {themes.map((th) => (
              <button
                key={th.key}
                onClick={() => setTheme(th.key)}
                aria-label={th.label}
                title={th.label}
                className={`h-7 w-7 rounded-full flex items-center justify-center transition-all ${
                  theme === th.key ? "bg-gold text-background" : "text-muted-foreground hover:text-gold"
                }`}
              >
                {th.icon}
              </button>
            ))}
          </div>

          <div className="relative flex items-center gap-1 rounded-full border border-gold/30 px-2 py-1 bg-card/50">
            <Globe className="h-3.5 w-3.5 text-gold/70" aria-hidden />
            <select
              value={i18n.language?.split("-")[0] ?? "ar"}
              onChange={(e) => changeLang(e.target.value)}
              className="bg-transparent text-xs font-medium outline-none cursor-pointer pr-1 appearance-none"
            >
              {SUPPORTED_LANGS.map((l) => (
                <option key={l.code} value={l.code} className="bg-card text-foreground">
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </header>
  );
}
