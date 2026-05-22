import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/Header";
import { articlesStore, slugify, type Article } from "@/lib/articles";
import { BUILTIN_CATEGORIES, categoriesStore, categoryLabel } from "@/lib/categories";
import { SUPPORTED_LANGS } from "@/lib/i18n";
import { MediaRenderer } from "@/components/MediaRenderer";
import { Plus, Pencil, Trash2, LogOut, Lock, X } from "lucide-react";

export const Route = createFileRoute("/admin")({ component: AdminPage });

const ADMIN_PASSWORD = "khaleff2025";
const AUTH_KEY = "kt_admin_auth";

function AdminPage() {
  const { t } = useTranslation();
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (sessionStorage.getItem(AUTH_KEY) === "1") setAuthed(true);
  }, []);

  const login = (e: React.FormEvent) => {
    e.preventDefault();
    if (pw === ADMIN_PASSWORD) {
      sessionStorage.setItem(AUTH_KEY, "1");
      setAuthed(true);
      setError("");
    } else {
      setError(t("admin.wrong_password"));
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      {!authed ? (
        <div className="flex-1 flex items-center justify-center px-6">
          <form onSubmit={login} className="w-full max-w-sm bg-card/70 border border-gold/30 rounded-lg p-8 shadow-mystic">
            <div className="flex items-center justify-center mb-6">
              <div className="h-12 w-12 rounded-full border border-gold/60 flex items-center justify-center">
                <Lock className="h-5 w-5 text-gold" />
              </div>
            </div>
            <h2 className="font-display text-2xl text-center mb-2 gradient-gold-text">{t("admin.title")}</h2>
            <p className="text-xs text-center text-muted-foreground mb-6">demo password: <span className="text-gold">khaleff2025</span></p>
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder={t("admin.password")}
              className="w-full px-4 py-3 bg-input border border-gold/30 rounded-md outline-none focus:border-gold mb-3"
              autoFocus
            />
            {error && <p className="text-xs text-destructive mb-3">{error}</p>}
            <button type="submit" className="w-full py-3 bg-gold text-background uppercase tracking-widest text-xs rounded-md hover:opacity-90 transition">
              {t("admin.login")}
            </button>
          </form>
        </div>
      ) : (
        <Dashboard onLogout={() => { sessionStorage.removeItem(AUTH_KEY); setAuthed(false); }} />
      )}
    </div>
  );
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const { t } = useTranslation();
  const [tick, setTick] = useState(0);
  const [editing, setEditing] = useState<Article | null>(null);

  useEffect(() => {
    const r = () => setTick((x) => x + 1);
    window.addEventListener("kt_articles_changed", r);
    window.addEventListener("kt_categories_changed", r);
    return () => {
      window.removeEventListener("kt_articles_changed", r);
      window.removeEventListener("kt_categories_changed", r);
    };
  }, []);

  const articles = articlesStore.list();
  void tick;

  const startNew = () => {
    setEditing({
      id: `a-${Date.now()}`,
      slug: "",
      title: "",
      excerpt: "",
      content: "",
      category: "philosophy",
      mediaUrl: "",
      createdAt: Date.now(),
      translations: {},
    });
  };

  return (
    <div className="flex-1 mx-auto max-w-6xl w-full px-6 py-12">
      <div className="flex items-center justify-between mb-10">
        <h1 className="font-display text-4xl gradient-gold-text">{t("admin.title")}</h1>
        <div className="flex items-center gap-2">
          <button onClick={startNew} className="inline-flex items-center gap-2 px-4 py-2 bg-gold text-background text-xs uppercase tracking-widest rounded-md hover:opacity-90">
            <Plus className="h-4 w-4" /> {t("admin.new_article")}
          </button>
          <button onClick={onLogout} className="inline-flex items-center gap-2 px-4 py-2 border border-gold/30 text-xs uppercase tracking-widest rounded-md hover:border-gold">
            <LogOut className="h-4 w-4" /> {t("admin.logout")}
          </button>
        </div>
      </div>

      {editing ? (
        <Editor
          article={editing}
          onCancel={() => setEditing(null)}
          onSave={(a) => { articlesStore.upsert(a); setEditing(null); }}
        />
      ) : (
        <>
          <CategoriesManager />
          {articles.length === 0 ? (
            <div className="text-center py-24 text-muted-foreground italic">{t("admin.no_articles")}</div>
          ) : (
        <div className="border border-gold/20 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-card/60 text-xs uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="text-start px-4 py-3">{t("admin.fields.title")}</th>
                <th className="text-start px-4 py-3 hidden md:table-cell">{t("admin.fields.category")}</th>
                <th className="text-start px-4 py-3 hidden md:table-cell">{t("admin.fields.slug")}</th>
                <th className="w-px px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {articles.map((a) => (
                <tr key={a.id} className="border-t border-gold/10 hover:bg-card/40">
                  <td className="px-4 py-3 font-display text-base">{a.title}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-gold text-xs uppercase tracking-widest">{categoryLabel(a.category, t)}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs text-muted-foreground">{a.slug}</td>
                  <td className="px-4 py-3 flex items-center gap-2">
                    <button onClick={() => setEditing({ ...a, translations: a.translations ?? {} })} className="p-2 rounded hover:bg-accent text-muted-foreground hover:text-gold">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => { if (confirm(t("admin.confirm_delete"))) articlesStore.remove(a.id); }}
                      className="p-2 rounded hover:bg-accent text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
          )}
        </>
      )}
    </div>
  );
}

function Editor({ article, onSave, onCancel }: { article: Article; onSave: (a: Article) => void; onCancel: () => void }) {
  const { t } = useTranslation();
  const [a, setA] = useState<Article>(article);
  const [trLang, setTrLang] = useState<string>("en");
  const trEntry = a.translations?.[trLang] ?? { title: "", excerpt: "", content: "" };

  const set = <K extends keyof Article>(k: K, v: Article[K]) => setA({ ...a, [k]: v });
  const setTr = (field: "title" | "excerpt" | "content", v: string) => {
    setA({
      ...a,
      translations: {
        ...(a.translations ?? {}),
        [trLang]: { ...trEntry, [field]: v },
      },
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const slug = a.slug.trim() || slugify(a.title);
    onSave({ ...a, slug });
  };

  const inputCls = "w-full px-4 py-3 bg-input border border-gold/30 rounded-md outline-none focus:border-gold text-sm";
  const labelCls = "block text-xs uppercase tracking-widest text-muted-foreground mb-2";

  return (
    <form onSubmit={submit} className="grid lg:grid-cols-[1fr_360px] gap-8">
      <div className="space-y-5">
        <div>
          <label className={labelCls}>{t("admin.fields.title")}</label>
          <input className={inputCls} value={a.title} onChange={(e) => set("title", e.target.value)} required />
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <label className={labelCls}>{t("admin.fields.slug")}</label>
            <input className={inputCls} value={a.slug} onChange={(e) => set("slug", e.target.value)} placeholder="auto" />
          </div>
          <div>
            <label className={labelCls}>{t("admin.fields.category")}</label>
            <select className={inputCls} value={a.category} onChange={(e) => set("category", e.target.value)}>
              {BUILTIN_CATEGORIES.map((c) => (
                <option key={c} value={c}>{t(`categories.${c}`)}</option>
              ))}
              {categoriesStore.list().map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls}>{t("admin.fields.media")}</label>
          <input className={inputCls} value={a.mediaUrl ?? ""} onChange={(e) => set("mediaUrl", e.target.value)} placeholder="https://..." />
          {a.mediaUrl && (
            <div className="mt-4">
              <MediaRenderer url={a.mediaUrl} />
            </div>
          )}
        </div>
        <div>
          <label className={labelCls}>{t("admin.fields.excerpt")}</label>
          <textarea className={inputCls} rows={3} value={a.excerpt} onChange={(e) => set("excerpt", e.target.value)} required />
        </div>
        <div>
          <label className={labelCls}>{t("admin.fields.content")}</label>
          <textarea className={inputCls + " min-h-[400px] font-serif text-base leading-relaxed"} value={a.content} onChange={(e) => set("content", e.target.value)} required />
        </div>

        <div className="flex items-center gap-3 pt-4">
          <button type="submit" className="px-6 py-3 bg-gold text-background uppercase tracking-widest text-xs rounded-md hover:opacity-90">
            {t("admin.save")}
          </button>
          <button type="button" onClick={onCancel} className="px-6 py-3 border border-gold/30 uppercase tracking-widest text-xs rounded-md hover:border-gold">
            {t("admin.cancel")}
          </button>
        </div>
      </div>

      <aside className="bg-card/60 border border-gold/20 rounded-lg p-5 h-fit sticky top-24">
        <h3 className="font-display text-lg gradient-gold-text mb-1">{t("admin.fields.translations")}</h3>
        <p className="text-xs text-muted-foreground mb-4">Override per-language. Empty = auto translate / original.</p>
        <label className={labelCls}>{t("admin.fields.lang")}</label>
        <select className={inputCls + " mb-4"} value={trLang} onChange={(e) => setTrLang(e.target.value)}>
          {SUPPORTED_LANGS.filter((l) => l.code !== "ar").map((l) => (
            <option key={l.code} value={l.code}>{l.label}</option>
          ))}
        </select>
        <div className="space-y-3">
          <input className={inputCls} placeholder={t("admin.fields.title")} value={trEntry.title} onChange={(e) => setTr("title", e.target.value)} />
          <textarea className={inputCls} rows={2} placeholder={t("admin.fields.excerpt")} value={trEntry.excerpt} onChange={(e) => setTr("excerpt", e.target.value)} />
          <textarea className={inputCls + " min-h-[160px]"} placeholder={t("admin.fields.content")} value={trEntry.content} onChange={(e) => setTr("content", e.target.value)} />
        </div>
      </aside>
    </form>
  );
}

function CategoriesManager() {
  const { t, i18n } = useTranslation();
  const isAr = (i18n.language?.split("-")[0] ?? "ar") === "ar";
  const [tick, setTick] = useState(0);
  const [label, setLabel] = useState("");
  useEffect(() => {
    const r = () => setTick((x) => x + 1);
    window.addEventListener("kt_categories_changed", r);
    return () => window.removeEventListener("kt_categories_changed", r);
  }, []);
  void tick;
  const custom = categoriesStore.list();

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    categoriesStore.add(label);
    setLabel("");
  };

  return (
    <div className="mb-10 border border-gold/20 rounded-lg p-5 bg-card/40">
      <h3 className="font-display text-lg gradient-gold-text mb-1">
        {isAr ? "إدارة الأقسام" : "Manage Categories"}
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        {isAr
          ? "الأقسام الافتراضية ثابتة. أضف أقسامًا مخصّصة لتنشر فيها مقالات جديدة."
          : "Built-in categories are fixed. Add custom categories to publish into."}
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {BUILTIN_CATEGORIES.map((c) => (
          <span key={c} className="px-3 py-1.5 text-xs uppercase tracking-widest rounded-full border border-gold/30 text-gold/80">
            {t(`categories.${c}`)}
          </span>
        ))}
        {custom.map((c) => (
          <span key={c.key} className="inline-flex items-center gap-2 px-3 py-1.5 text-xs uppercase tracking-widest rounded-full border border-gold/50 bg-gold/10 text-gold">
            {c.label}
            <button
              type="button"
              onClick={() => {
                if (confirm(isAr ? "حذف هذا القسم؟" : "Delete this category?")) {
                  categoriesStore.remove(c.key);
                }
              }}
              className="opacity-70 hover:opacity-100 hover:text-destructive"
              aria-label="remove"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>

      <form onSubmit={add} className="flex gap-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={isAr ? "اسم القسم الجديد" : "New category name"}
          className="flex-1 px-4 py-2 bg-input border border-gold/30 rounded-md outline-none focus:border-gold text-sm"
        />
        <button type="submit" className="inline-flex items-center gap-2 px-4 py-2 bg-gold text-background text-xs uppercase tracking-widest rounded-md hover:opacity-90">
          <Plus className="h-4 w-4" /> {isAr ? "إضافة" : "Add"}
        </button>
      </form>
    </div>
  );
}
