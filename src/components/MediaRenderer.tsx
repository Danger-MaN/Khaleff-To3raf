interface Props { url?: string; alt?: string }

function getYouTubeId(url: string): string | null {
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function getTeraboxShareId(url: string): string | null {
  // Supports terabox.com, 1024terabox.com, teraboxapp.com, terabox.app, dubox.com etc.
  if (!/(terabox|teraboxapp|terabox\.app|1024terabox|dubox|4funbox|mirrobox|nephobox|momerybox|tibibox|sharebox)\./i.test(url)) {
    return null;
  }
  const patterns = [
    /[?&]surl=([a-zA-Z0-9_-]+)/,
    /\/s\/1?([a-zA-Z0-9_-]+)/,
    /\/sharing\/link\?surl=([a-zA-Z0-9_-]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

export function MediaRenderer({ url, alt = "" }: Props) {
  if (!url) return null;
  const yt = getYouTubeId(url);

  if (yt) {
    return (
      <div className="relative w-full overflow-hidden rounded-lg shadow-mystic border border-gold/30" style={{ aspectRatio: "16/9" }}>
        <iframe
          src={`https://www.youtube.com/embed/${yt}`}
          title="YouTube video"
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  const tb = getTeraboxShareId(url);
  if (tb) {
    const embedSrc = `https://www.terabox.com/sharing/embed?surl=${tb}`;
    return (
      <div className="relative w-full overflow-hidden rounded-lg shadow-mystic border border-gold/30 bg-black" style={{ aspectRatio: "16/9" }}>
        <iframe
          src={embedSrc}
          title="Terabox media"
          className="absolute inset-0 h-full w-full"
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          allowFullScreen
          referrerPolicy="no-referrer"
        />
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-2 end-2 text-[10px] uppercase tracking-widest px-2 py-1 rounded bg-background/70 text-gold border border-gold/30 hover:bg-background"
        >
          Terabox ↗
        </a>
      </div>
    );
  }

  if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(url)) {
    return (
      <video
        src={url}
        controls
        className="w-full rounded-lg shadow-mystic border border-gold/30 bg-black"
      />
    );
  }

  if (/\.(jpe?g|png|webp|gif|avif|svg)(\?|$)/i.test(url) || /^https?:\/\//.test(url)) {
    return (
      <img
        src={url}
        alt={alt}
        loading="lazy"
        className="w-full rounded-lg shadow-mystic border border-gold/30 object-cover"
      />
    );
  }

  return null;
}
