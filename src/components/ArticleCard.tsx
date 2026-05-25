import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { type Article } from "@/lib/articles";
import { categoryLabel } from "@/lib/categories";

const CATEGORY_ACCENT: Record<string, string> = {
  philosophy: "from-indigo-500/40 via-gold/30 to-transparent",
  science: "from-emerald-500/40 via-gold/30 to-transparent",
  sexuality: "from-rose-500/40 via-gold/30 to-transparent",
  general: "from-amber-500/40 via-gold/30 to-transparent",
};

const CATEGORY_DOT: Record<string, string> = {
  philosophy: "bg-indigo-400",
  science: "bg-emerald-400",
  sexuality: "bg-rose-400",
  general: "bg-amber-400",
};

const DEFAULT_ACCENT = "from-gold/40 via-gold/20 to-transparent";
const DEFAULT_DOT = "bg-gold";

// دالة لاستخراج معرف اليوتيوب من الرابط (للبطاقة فقط)
function getYouTubeThumbnail(url: string): string | null {
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return `https://img.youtube.com/vi/${m[1]}/mqdefault.jpg`;
  }
  return null;
}

export function ArticleCard({ article, index = 0 }: { article: Article; index?: number }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.split("-")[0] ?? "ar";
  const tr = article.translations?.[lang];
  const title = tr?.title ?? article.title;
  const excerpt = tr?.excerpt ?? article.excerpt;
  const accent = CATEGORY_ACCENT[article.category] ?? DEFAULT_ACCENT;
  const dot = CATEGORY_DOT[article.category] ?? DEFAULT_DOT;

  const featured = index % 5 === 0;
  
  // الحصول على صورة مصغرة للمعاينة
  const thumbnailUrl = article.mediaUrl ? getYouTubeThumbnail(article.mediaUrl) : null;

  return (
    <Link
      to="/p/$id"
      params={{ id: String(article.createdAt) }}
      className={`group relative flex flex-col overflow-hidden rounded-xl border border-gold/25 bg-card/70 hover:border-gold transition-all duration-500 hover:-translate-y-1.5 hover:shadow-mystic animate-fade-up ${
        featured ? "md:col-span-2 lg:col-span-2" : ""
      }`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Top accent bar — unique per category */}
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent}`} />

      {/* Large faded number to differentiate position */}
      <span
        aria-hidden
        className="pointer-events-none absolute top-3 end-4 font-display text-6xl leading-none text-gold/15 group-hover:text-gold/30 transition-colors select-none"
      >
        {String(index + 1).padStart(2, "0")}
      </span>

      {article.mediaUrl && (
        <div className={`overflow-hidden relative ${featured ? "aspect-[21/9]" : "aspect-[16/10]"}`}>
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-black flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-gold/80 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent opacity-80 pointer-events-none" />
        </div>
      )}

      <div className="flex flex-col gap-3 p-6 flex-1">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em]">
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${dot}`} />
          <span className="text-gold">{categoryLabel(article.category, t)}</span>
        </div>

        <h3 className={`font-display leading-tight text-foreground group-hover:text-gold transition-colors ${
          featured ? "text-3xl md:text-4xl" : "text-2xl"
        }`}>
          {title}
        </h3>

        <div className="h-px w-12 bg-gold/40 group-hover:w-20 group-hover:bg-gold transition-all duration-500" />

        <p className={`text-sm text-muted-foreground leading-relaxed ${featured ? "line-clamp-4" : "line-clamp-3"}`}>
          {excerpt}
        </p>

        <div className="mt-auto pt-3 text-xs uppercase tracking-widest text-gold/80 group-hover:text-gold flex items-center gap-2">
          {t("article.read_more")} <span className="transition-transform group-hover:translate-x-1">→</span>
        </div>
      </div>
    </Link>
  );
}
