import { useState, useEffect } from "react";

interface Props {
  url?: string;
  alt?: string;
}

// استخراج معرف يوتيوب
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

// استخراج معرف المشاركة من رابط تيرابوكس
function getTeraboxShareId(url: string): string | null {
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

// استدعاء API لتحويل رابط المشاركة إلى رابط مباشر
async function fetchTeraboxDirectUrl(shareUrl: string): Promise<{ type: "video" | "image"; url: string } | null> {
  try {
    // استخدام API مجاني (قد يتغير أو يتوقف، يمكن استبداله بوكل خاص)
    const apiUrl = `https://terabox-worker.robinkumarshakya103.workers.dev/api?url=${encodeURIComponent(shareUrl)}`;
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!data.success || !data.files || data.files.length === 0) {
      return null;
    }

    const file = data.files[0];
    const fileName = file.file_name?.toLowerCase() || "";
    const isVideo = /\.(mp4|webm|mov|mkv|avi|m4v)$/i.test(fileName);
    const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|avif)$/i.test(fileName);

    if (isVideo && file.streaming_url) {
      return { type: "video", url: file.streaming_url };
    } else if (isImage && file.download_url) {
      return { type: "image", url: file.download_url };
    }
    return null;
  } catch (error) {
    console.error("Terabox API error:", error);
    return null;
  }
}

export function MediaRenderer({ url, alt = "" }: Props) {
  if (!url) return null;

  // 1. يوتيوب
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

  // 2. تيرابوكس – نحاول الحصول على رابط مباشر
  const tbShareId = getTeraboxShareId(url);
  if (tbShareId) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [direct, setDirect] = useState<{ type: "video" | "image"; url: string } | null>(null);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [loading, setLoading] = useState(true);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [error, setError] = useState(false);

    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      let cancelled = false;
      setLoading(true);
      setError(false);
      fetchTeraboxDirectUrl(url)
        .then(result => {
          if (!cancelled) {
            setDirect(result);
            setLoading(false);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setError(true);
            setLoading(false);
          }
        });
      return () => { cancelled = true; };
    }, [url]);

    if (loading) {
      return (
        <div className="w-full rounded-lg shadow-mystic border border-gold/30 bg-black/20 flex items-center justify-center p-8" style={{ aspectRatio: "16/9" }}>
          <span className="text-gold/70 text-sm">جاري تحميل الوسائط من Terabox...</span>
        </div>
      );
    }

    if (direct && direct.type === "video") {
      return (
        <video
          src={direct.url}
          controls
          className="w-full rounded-lg shadow-mystic border border-gold/30 bg-black"
        />
      );
    }

    if (direct && direct.type === "image") {
      return (
        <img
          src={direct.url}
          alt={alt}
          loading="lazy"
          className="w-full rounded-lg shadow-mystic border border-gold/30 object-cover"
        />
      );
    }

    // Fallback: iframe الأصلي من تيرابوكس أو رابط خارجي في حالة الفشل
    const embedSrc = `https://www.terabox.com/sharing/embed?surl=${tbShareId}`;
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

  // 3. ملف فيديو مباشر
  if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(url)) {
    return (
      <video
        src={url}
        controls
        className="w-full rounded-lg shadow-mystic border border-gold/30 bg-black"
      />
    );
  }

  // 4. صورة مباشرة
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
