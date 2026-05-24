// lib/articles.ts
export interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  mediaUrl?: string;
  videoAspect?: string; // 'auto' | '16:9' | '9:16' | '1:1' | '4:3' | '21:9'
  createdAt: number;
  translations?: Record<string, { title: string; excerpt: string; content: string }>;
}

export const slugify = (text: string) => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
};

const STORAGE_KEY = "kt_articles";

const load = (): Article[] => {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

const save = (articles: Article[]) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(articles));
};

let articlesCache: Article[] | null = null;

export const articlesStore = {
  list: (): Article[] => {
    if (!articlesCache) articlesCache = load();
    return [...articlesCache].sort((a, b) => b.createdAt - a.createdAt);
  },
  get: (id: string): Article | undefined => {
    return articlesStore.list().find((a) => a.id === id);
  },
  upsert: (article: Article) => {
    const list = articlesStore.list();
    const idx = list.findIndex((a) => a.id === article.id);
    if (idx !== -1) list[idx] = article;
    else list.unshift(article);
    articlesCache = list;
    save(list);
    window.dispatchEvent(new Event("kt_articles_changed"));
  },
  remove: (id: string) => {
    let list = articlesStore.list();
    list = list.filter((a) => a.id !== id);
    articlesCache = list;
    save(list);
    window.dispatchEvent(new Event("kt_articles_changed"));
  },
};
