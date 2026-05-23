import { useEffect, useState } from "react";

interface Props {
  url?: string;
  alt?: string;
}

type TeraboxData =
  | {
      kind: "image";
      src: string;
      alt?: string;
    }
  | {
      kind: "video";
      src: string;
    }
  | {
      kind: "embed";
      src: string;
    };

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

function isTeraboxUrl(url: string): boolean {
  return /(terabox|teraboxapp|terabox\.app|1024terabox|dubox|4funbox|mirrobox|nephobox|momerybox|tibibox|sharebox)\./i.test(
    url
  );
}

function getTeraboxShareId(url: string): string | null {
  if (!isTeraboxUrl(url)) return null;

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

async function fetchTeraboxMeta(
  shareUrl: string
): Promise<TeraboxData> {
  const res = await fetch(
    `/api/terabox/resolve?url=${encodeURIComponent(shareUrl)}`
  );

  if (!res.ok) {
    throw new Error("Failed to resolve Terabox media");
  }

  return res.json();
}

function TeraboxViewer({
  shareUrl,
  alt,
}: {
  shareUrl: string;
  alt: string;
}) {
  const [data, setData] = useState<TeraboxData | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setFailed(false);

    fetchTeraboxMeta(shareUrl)
      .then((meta) => {
        if (!active) return;

        setData(meta);
      })
      .catch(() => {
        if (!active) return;

        setFailed(true);
      })
      .finally(() => {
        if (!active) return;

        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [shareUrl]);

  if (loading) {
    return (
      <div className="w-full rounded-lg border border-gold/30 bg-black/40 p-4 text-sm text-muted-foreground">
        جاري تحميل المحتوى...
      </div>
    );
  }

  if (failed || !data) {
    return (
      <div className="w-full rounded-lg border border-red-500/30 bg-black/40 p-4 text-sm text-red-300">
        فشل تحميل محتوى Terabox
      </div>
    );
  }

  if (data.kind === "image") {
    return (
      <img
        src={data.src}
        alt={data.alt || alt}
        loading="lazy"
        className="w-full rounded-lg shadow-mystic border border-gold/30 object-cover"
      />
    );
  }

  if (data.kind === "video") {
    return (
      <video
        src={data.src}
        controls
        playsInline
        className="w-full rounded-lg shadow-mystic border border-gold/30 bg-black"
      />
    );
  }

  return (
    <div
      className="relative w-full overflow-hidden rounded-lg shadow-mystic border border-gold/30 bg-black"
      style={{ aspectRatio: "16/9" }}
    >
      <iframe
        src={data.src}
        title="Terabox media"
        className="absolute inset-0 h-full w-full"
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
        allowFullScreen
        referrerPolicy="no-referrer"
      />
    </div>
  );
}

export function MediaRenderer({
  url,
  alt = "",
}: Props) {
  if (!url) return null;

  const yt = getYouTubeId(url);

  if (yt) {
    return (
      <div
        className="relative w-full overflow-hidden rounded-lg shadow-mystic border border-gold/30"
        style={{ aspectRatio: "16/9" }}
      >
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
    return (
      <TeraboxViewer
        shareUrl={url}
        alt={alt}
      />
    );
  }

  if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(url)) {
    return (
      <video
        src={url}
        controls
        playsInline
        className="w-full rounded-lg shadow-mystic border border-gold/30 bg-black"
      />
    );
  }

  if (
    /\.(jpe?g|png|webp|gif|avif|svg)(\?|$)/i.test(url)
  ) {
    return (
      <img
        src={url}
        alt={alt}
        loading="lazy"
        className="w-full rounded-lg shadow-mystic border border-gold/30 object-cover"
      />
    );
  }

  if (/^https?:\/\//.test(url)) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-lg border border-gold/30 px-4 py-2 text-sm text-gold hover:bg-gold/10 transition-colors"
      >
        فتح الرابط ↗
      </a>
    );
  }

  return null;
}
