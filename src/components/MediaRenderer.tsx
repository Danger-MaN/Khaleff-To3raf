interface Props {
  url?: string;
  alt?: string;
}

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
  return /(terabox|teraboxapp|terabox\.app|1024terabox|dubox|4funbox|mirrobox|nephobox|momerybox|tibibox|sharebox)\./i.test(url);
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

async function fetchTeraboxMeta(shareUrl: string) {
  const res = await fetch(`/api/terabox/resolve?url=${encodeURIComponent(shareUrl)}`);
  if (!res.ok) throw new Error("Failed to resolve Terabox media");
  return res.json() as Promise<
    | { kind: "image"; src: string; alt?: string }
    | { kind: "video"; src: string }
    | { kind: "embed"; src: string }
  >;
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
    return <TeraboxViewer shareUrl={url} alt={alt} />;
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

function TeraboxViewer({ shareUrl, alt }: { shareUrl: string; alt: string }) {
  const [data, setData] = React.useState<
    { kind: "image"; src: string; alt?: string } |
    { kind: "video"; src: string } |
    { kind: "embed"; src: string } |
    null
  >(null);

  React.useEffect(() => {
    let active = true;
    fetchTeraboxMeta(shareUrl)
      .then((meta) => {
        if (active) setData(meta);
      })
      .catch(() => {
        if (active) setData(null);
      });

    return () => {
      active = false;
    };
  }, [shareUrl]);

  if (!data) {
    return (
      <div className="w-full rounded-lg border border-gold/30 bg-black/40 p-4 text-sm text-muted-foreground">
        جاري تحميل المحتوى...
      </div>
    );
  }

  if (data.kind === "image") {
    return <img src={data.src} alt={data.alt || alt} className="w-full rounded-lg object-cover" loading="lazy" />;
  }

  if (data.kind === "video") {
    return (
      <video
        src={data.src}
        controls
        playsInline
        className="w-full rounded-lg bg-black"
      />
    );
  }

  return (
    <iframe
      src={data.src}
      title="Terabox media"
      className="w-full rounded-lg"
      style={{ aspectRatio: "16/9" }}
      allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
      allowFullScreen
    />
  );
}
