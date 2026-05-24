export type CategoryKey = "philosophy" | "science" | "sexuality" | "general";
// src/lib/articles.ts
export type CategoryKey = "philosophy" | "science" | "sexuality" | "general";

// تحديد الأنماط المسموحة لعرض الفيديو
export type VideoAspect = "auto" | "landscape" | "portrait";

export interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  mediaUrl?: string;
  videoAspect?: VideoAspect; // الحقل الجديد (اختياري، القيمة الافتراضية auto)
  createdAt: number;
  translations?: Partial<Record<string, { title: string; excerpt: string; content: string }>>;
}

const KEY = "kt_articles_v1";

// تحديث البيانات الأولية (SEED) لتشمل الحقل الجديد
const SEED: Article[] = [
  {
    id: "seed-1",
    slug: "fi-madh-al-shakk",
    title: "الدحيح - إنجاب الاحباب",
    excerpt: "واحنا مكنش لينا دور في معانتنا ✨.",
    content: `... (المحتوى الأصلي) ...`,
    category: "philosophy",
    mediaUrl: "https://drive.google.com/file/d/1po6iq-EsZYWKmqvW6FZzB2OOYdMWUS3e/view?usp=drivesdk",
    videoAspect: "auto",
    createdAt: 1730000000000,
  },
];

function read(): Article[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      localStorage.setItem(KEY, JSON.stringify(SEED));
      return SEED;
    }
    return JSON.parse(raw) as Article[];
  } catch {
    return SEED;
  }
}

function write(list: Article[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("kt_articles_changed"));
}

export const articlesStore = {
  list(): Article[] {
    return read().sort((a, b) => b.createdAt - a.createdAt);
  },
  get(slug: string): Article | undefined {
    return read().find((a) => a.slug === slug);
  },
  getById(id: string | number): Article | undefined {
    const n = typeof id === "string" ? Number(id) : id;
    return read().find((a) => a.createdAt === n);
  },
  upsert(a: Article) {
    const list = read();
    const i = list.findIndex((x) => x.id === a.id);
    if (i >= 0) list[i] = a;
    else list.unshift(a);
    write(list);
  },

  remove(id: string) {
    write(read().filter((a) => a.id !== id));
  },
  reset() {
    localStorage.removeItem(KEY);
    write(SEED);
  },
};

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[\s\u0600-\u06FF]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || `article-${Date.now()}`;
}

export function readingTime(text: string): number {
  return Math.max(1, Math.round(text.split(/\s+/).length / 220));
}
