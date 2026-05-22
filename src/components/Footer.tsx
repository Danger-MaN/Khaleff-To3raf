import { useTranslation } from "react-i18next";
import { Facebook, Twitter, Instagram, Youtube, Send, Github } from "lucide-react";

// Edit these URLs to point to your real social profiles.
const SOCIALS = [
  { label: "Facebook", href: "https://facebook.com/", icon: Facebook },
  { label: "X / Twitter", href: "https://x.com/", icon: Twitter },
  { label: "Instagram", href: "https://instagram.com/", icon: Instagram },
  { label: "YouTube", href: "https://youtube.com/", icon: Youtube },
  { label: "Telegram", href: "https://t.me/", icon: Send },
  { label: "GitHub", href: "https://github.com/", icon: Github },
];

export function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="mt-auto border-t border-gold/20 py-8">
      <div className="mx-auto max-w-7xl px-6 flex flex-col items-center gap-5">
        <div className="flex flex-wrap items-center justify-center gap-3">
          {SOCIALS.map(({ label, href, icon: Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              title={label}
              className="h-10 w-10 rounded-full border border-gold/30 flex items-center justify-center text-muted-foreground hover:text-gold hover:border-gold transition-all hover:-translate-y-0.5"
            >
              <Icon className="h-4 w-4" />
            </a>
          ))}
        </div>
        <div className="text-center text-xs uppercase tracking-[0.3em] text-muted-foreground">
          {t("footer")}
        </div>
      </div>
    </footer>
  );
}
