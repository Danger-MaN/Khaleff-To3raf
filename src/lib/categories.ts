// Custom categories store. Built-in categories are translated via i18n;
// custom categories store their display label as the user enters it.
const KEY = "kt_categories_v1";

export const BUILTIN_CATEGORIES = ["philosophy", "science", "sexuality", "general"] as const;
export type BuiltinCategory = (typeof BUILTIN_CATEGORIES)[number];

export interface CustomCategory {
  key: string;
  label: string;
}

function read(): CustomCategory[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CustomCategory[]) : [];
  } catch {
    return [];
  }
}

function write(list: CustomCategory[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("kt_categories_changed"));
}

export function slugifyKey(input: string): string {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/[\s\u0600-\u06FF]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return base || `cat-${Date.now()}`;
}

export const categoriesStore = {
  list(): CustomCategory[] {
    return read();
  },
  add(label: string): CustomCategory {
    const trimmed = label.trim();
    if (!trimmed) throw new Error("empty");
    const list = read();
    let key = slugifyKey(trimmed);
    if (BUILTIN_CATEGORIES.includes(key as BuiltinCategory) || list.some((c) => c.key === key)) {
      key = `${key}-${Date.now().toString(36).slice(-4)}`;
    }
    const entry = { key, label: trimmed };
    write([...list, entry]);
    return entry;
  },
  remove(key: string) {
    write(read().filter((c) => c.key !== key));
  },
  find(key: string): CustomCategory | undefined {
    return read().find((c) => c.key === key);
  },
};

export function categoryLabel(
  key: string,
  tFn: (k: string) => string,
): string {
  if ((BUILTIN_CATEGORIES as readonly string[]).includes(key)) {
    return tFn(`categories.${key}`);
  }
  return categoriesStore.find(key)?.label ?? key;
}
