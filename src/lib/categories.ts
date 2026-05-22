// Unified categories store. Built-in categories are seeded on first run,
// then become fully editable / removable from the admin panel just like
// custom ones.
const KEY = "kt_categories_v2";
const LEGACY_KEY = "kt_categories_v1";

export interface Category {
  key: string;
  label: string;
}

const DEFAULTS: Category[] = [
  { key: "philosophy", label: "فلسفة" },
  { key: "science", label: "علم" },
  { key: "sexuality", label: "ثقافة جنسية" },
  { key: "general", label: "عام" },
];

// Kept for backwards-compat imports; do not rely on it for filtering anymore.
export const BUILTIN_CATEGORIES = DEFAULTS.map((d) => d.key) as readonly string[];

function read(): Category[] {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Category[];
    // Migrate v1 custom categories on top of defaults, then seed.
    let migrated: Category[] = [...DEFAULTS];
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      try {
        const arr = JSON.parse(legacy) as Category[];
        migrated = [...DEFAULTS, ...arr.filter((c) => !DEFAULTS.some((d) => d.key === c.key))];
      } catch {
        /* ignore */
      }
    }
    localStorage.setItem(KEY, JSON.stringify(migrated));
    return migrated;
  } catch {
    return DEFAULTS;
  }
}

function write(list: Category[]) {
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
  list(): Category[] {
    return read();
  },
  add(label: string): Category {
    const trimmed = label.trim();
    if (!trimmed) throw new Error("empty");
    const list = read();
    let key = slugifyKey(trimmed);
    if (list.some((c) => c.key === key)) {
      key = `${key}-${Date.now().toString(36).slice(-4)}`;
    }
    const entry = { key, label: trimmed };
    write([...list, entry]);
    return entry;
  },
  update(key: string, label: string) {
    const trimmed = label.trim();
    if (!trimmed) return;
    write(read().map((c) => (c.key === key ? { ...c, label: trimmed } : c)));
  },
  remove(key: string) {
    write(read().filter((c) => c.key !== key));
  },
  find(key: string): Category | undefined {
    return read().find((c) => c.key === key);
  },
};

// `tFn` kept for signature compatibility with existing call sites.
export function categoryLabel(key: string, _tFn?: (k: string) => string): string {
  void _tFn;
  return categoriesStore.find(key)?.label ?? key;
}
