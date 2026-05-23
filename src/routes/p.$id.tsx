import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MediaRenderer } from "@/components/MediaRenderer";
import { articlesStore, type Article } from "@/lib/articles";
import { categoryLabel } from "@/lib/categories";
import { translateText } from "@/lib/translate";
import { Loader2, Languages, CalendarDays } from "lucide-react";

export const Route = createFileRoute("/p/$id")({ component: ArticleByIdPage });

const SOURCE_LANG = "ar";

function ArticleByIdPage() {
  const { id } = Route.useParams();
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.split("-")[0] ?? "ar";

  const [article, setArticle] = useState<Article | null | undefined>(undefined);
  const [autoT, setAutoT] = useState<{ title: string; content: string } | null>(null);
  const [translating, setTranslating] = useState(false);
  const reqId = useRef(0);

  useEffect(() => {
    setArticle(articlesStore.getById(id) ?? null);
  }, [id]);

  useEffect(() => {
    if (!article) return;
    setAutoT(null);
    const manual = article.translations?.[lang];
    if (manual) return;
    if (lang === SOURCE_LANG) return;

    const myReq = ++reqId.current;
    setTranslating(true);
    Promise.all([
      translateText(article.title, lang),
      translateText(article.content, lang),
    ])
      .then(([tTitle, tContent]) => {
        if (reqId.current === myReq) setAutoT({ title: tTitle, content: tContent });
      })
      .catch(() => {})
      .finally(() => {
        if (reqId.current === myReq) setTranslating(false);
      });
  }, [article, lang]);

  if (article === undefined) return null;
  if (article === null) throw notFound();

  const manual = article.translations?.[lang];
  const title = autoT?.title ?? manual?.title ?? article.title;
  const content = autoT?.content ?? manual?.content ?? article.content;
  const showAutoNotice = !!autoT;

  const dateFmt = new Intl.DateTimeFormat(lang, {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
    timeZone: "Africa/Cairo",
  }).format(new Date(article.createdAt));

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <article className="mx-auto max-w-3xl px-6 py-16 w-full flex-1">
        <Link to="/" className="text-xs uppercase tracking-widest text-gold hover:opacity-80">
          {t("article.back")}
        </Link>

        <div className="mt-8 mb-6 text-[10px] uppercase tracking-[0.3em] text-gold">
          {categoryLabel(article.category, t)}
        </div>

        <h1 className="font-display text-4xl md:text-6xl leading-tight mb-6 text-foreground">
          {title}
        </h1>

        {translating && (
          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground mb-4">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {t("article.translating")}
          </div>
        )}
        {showAutoNotice && !translating && (
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-widest text-gold/70 mb-4">
            <Languages className="h-3.5 w-3.5" />
            {t("article.translated_notice")}
          </div>
        )}

        <div className="divider-pharaoh my-10" />

        <div className="prose-article text-foreground/90 whitespace-pre-wrap">
          {content.split(/\n\n+/).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        {article.mediaUrl && (
          <div className="my-10">
            <MediaRenderer url={article.mediaUrl} alt={title} />
          </div>
        )}

        <div className="divider-pharaoh my-12" />

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5 text-gold/70" />
          <span>{dateFmt}</span>
        </div>
      </article>
      <Footer />
    </div>
  );
}
