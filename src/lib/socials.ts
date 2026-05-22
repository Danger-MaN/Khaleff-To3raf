// Social links store, editable from the admin panel.
const KEY = "kt_socials_v1";

export const SOCIAL_ICONS = [
  "Facebook",
  "Twitter",
  "Instagram",
  "Youtube",
  "Send", // Telegram
  "Github",
  "Linkedin",
  "Music", // TikTok-ish
  "Globe",
  "Mail",
] as const;
export type SocialIcon = (typeof SOCIAL_ICONS)[number];

export interface SocialLink {
  id: string;
  label: string;
  href: string;
  icon: SocialIcon;
}

const DEFAULTS: SocialLink[] = [
  { id: "s-fb", label: "Facebook", href: "https://facebook.com/", icon: "Facebook" },
  { id: "s-x", label: "X / Twitter", href: "https://x.com/", icon: "Twitter" },
  { id: "s-ig", label: "Instagram", href: "https://instagram.com/", icon: "Instagram" },
  { id: "s-yt", label: "YouTube", href: "https://youtube.com/", icon: "Youtube" },
  { id: "s-tg", label: "Telegram", href: "https://t.me/", icon: "Send" },
  { id: "s-gh", label: "GitHub", href: "https://github.com/", icon: "Github" },
];

function read(): SocialLink[] {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      localStorage.setItem(KEY, JSON.stringify(DEFAULTS));
      return DEFAULTS;
    }
    return JSON.parse(raw) as SocialLink[];
  } catch {
    return DEFAULTS;
  }
}

function write(list: SocialLink[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("kt_socials_changed"));
}

export const socialsStore = {
  list(): SocialLink[] {
    return read();
  },
  add(item: Omit<SocialLink, "id">): SocialLink {
    const entry: SocialLink = { id: `s-${Date.now().toString(36)}`, ...item };
    write([...read(), entry]);
    return entry;
  },
  update(id: string, patch: Partial<Omit<SocialLink, "id">>) {
    write(read().map((s) => (s.id === id ? { ...s, ...patch } : s)));
  },
  remove(id: string) {
    write(read().filter((s) => s.id !== id));
  },
  reset() {
    write(DEFAULTS);
  },
};
