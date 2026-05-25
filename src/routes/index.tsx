import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

import { ArticleCard } from "@/components/ArticleCard";
import { articlesStore } from "@/lib/articles";
import { categoriesStore, categoryLabel } from "@/lib/categories";
import { TranslatedText } from "@/components/TranslatedText";
import { Search } from "lucide-react";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { t } = useTranslation();
  const [tick, setTick] = useState(0);
  const [cat, setCat] = useState<string>("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    const refresh = () => setTick((x) => x + 1);
    window.addEventListener("kt_articles_changed", refresh);
    window.addEventListener("kt_categories_changed", refresh);
    return () => {
      window.removeEventListener("kt_articles_changed", refresh);
      window.removeEventListener("kt_categories_changed", refresh);
    };
  }, []);

  const cats = useMemo(() => {
    void tick;
    return ["all", ...categoriesStore.list().map((c) => c.key)];
  }, [tick]);

  const articles = useMemo(() => {
    void tick;
    let list = articlesStore.list();
    if (cat !== "all") list = list.filter((a) => a.category === cat);
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      const matches = (s?: string) => !!s && s.toLowerCase().includes(needle);
      list = list.filter((a) => {
        if (matches(a.title) || matches(a.excerpt) || matches(a.content)) return true;
        const tr = a.translations ?? {};
        return Object.values(tr).some(
          (v) => matches(v?.title) || matches(v?.excerpt) || matches(v?.content),
        );
      });
    }
    return list;
  }, [tick, cat, q]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* HERO - Modified with reduced spacing */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 h-[600px] w-[600px] rounded-full bg-gold/5 blur-3xl" />
          <div className="absolute top-0 left-8 bottom-0 w-px column-line opacity-50 hidden md:block" />
          <div className="absolute top-0 right-8 bottom-0 w-px column-line opacity-50 hidden md:block" />
        </div>
        <div className="relative mx-auto max-w-5xl px-12 pt-10 pb-12 text-center">
          <div className="inline-block text-[10px] uppercase tracking-[0.5em] text-gold mb-3 animate-shimmer">
            ✦ {t("hero.eyebrow")} ✦
          </div>
          <h1 className="font-display text-6xl md:text-8xl leading-[0.95] mb-6 gradient-gold-text">
            {t("brand")}
          </h1>
          <div className="divider-pharaoh my-6 max-w-md mx-auto" />
          <p className="text-xl md:text-2xl text-foreground/90 font-display italic max-w-2xl mx-auto leading-snug mt-5">
            {t("slogan")}
          </p>
          <p className="mt-4 text-xs uppercase tracking-[0.3em] text-muted-foreground">
            {t("tagline")}
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <a
              href="#articles"
              className="inline-flex items-center gap-2 px-7 py-3 bg-gold text-background font-medium tracking-wider uppercase text-sm rounded hover:opacity-90 transition shadow-mystic"
            >
              {t("hero.cta_read")}
            </a>
          </div>
        </div>
      </section>

      {/* FILTERS + GRID */}
      <section id="articles" className="mx-auto max-w-7xl px-6 pb-24 w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div className="flex flex-wrap items-center gap-2">
            {cats.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`px-4 py-2 text-xs uppercase tracking-widest border rounded-full transition-all ${
                  cat === c
                    ? "bg-gold text-background border-gold"
                    : "border-gold/30 text-muted-foreground hover:border-gold hover:text-gold"
                }`}
              >
                {c === "all" ? t("filters.all") : <TranslatedText text={categoryLabel(c, t)} />}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("filters.search")}
              className="ps-10 pe-4 py-2 bg-card/60 border border-gold/30 rounded-full text-sm w-full md:w-72 outline-none focus:border-gold transition"
            />
          </div>
        </div>

        {articles.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground italic">{t("article.no_articles")}</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((a, i) => (
              <ArticleCard key={a.id} article={a} index={i} />
            ))}
          </div>
        )}
      </section>

      <Footer />

    </div>
  );
}
