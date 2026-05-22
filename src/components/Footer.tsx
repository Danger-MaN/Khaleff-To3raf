import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import * as Icons from "lucide-react";
import { socialsStore, type SocialLink } from "@/lib/socials";

export function Footer() {
  const { t } = useTranslation();
  const [links, setLinks] = useState<SocialLink[]>(() => socialsStore.list());

  useEffect(() => {
    const refresh = () => setLinks(socialsStore.list());
    window.addEventListener("kt_socials_changed", refresh);
    return () => window.removeEventListener("kt_socials_changed", refresh);
  }, []);

  return (
    <footer className="mt-auto border-t border-gold/20 py-8">
      <div className="mx-auto max-w-7xl px-6 flex flex-col items-center gap-5">
        {links.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-3">
            {links.map((s) => {
              const Icon =
                (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[
                  s.icon
                ] ?? Icons.Link;
              return (
                <a
                  key={s.id}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  title={s.label}
                  className="h-10 w-10 rounded-full border border-gold/30 flex items-center justify-center text-muted-foreground hover:text-gold hover:border-gold transition-all hover:-translate-y-0.5"
                >
                  <Icon className="h-4 w-4" />
                </a>
              );
            })}
          </div>
        )}
        <div className="text-center text-xs uppercase tracking-[0.3em] text-muted-foreground">
          {t("footer")}
        </div>
      </div>
    </footer>
  );
}
