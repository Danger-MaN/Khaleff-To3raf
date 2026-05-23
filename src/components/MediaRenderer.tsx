// MediaRenderer.tsx
"use client";

import { useState, useEffect } from "react";

interface Props {
  url?: string;
  alt?: string;
}

// رابط الـ Worker الخاص بك
const TERABOX_WORKER = "https://terabox.dangerhelp10.workers.dev";

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

// استدعاء الـ Worker للحصول على رابط مباشر من تيرابوكس
async function fetchTeraboxDirectUrl(shareUrl: string): Promise<{ type: "video" | "image"; url: string } | null> {
  try {
    const response = await fetch(`${TERABOX_WORKER}?url=${encodeURIComponent(shareUrl)}`);
    const data = await response.json();

    if (data.success && (data.type === "video" || data.type === "image")) {
      return {
        type: data.type,
        url: data.streaming_url,
      };
    }
    return null;
  } catch (error) {
    console.error("Terabox worker error:", error);
    return null;
  }
}

// MediaRenderer.tsx
// ... (الدوال المساعدة getYouTubeId, getTeraboxShareId, fetchTeraboxDirectUrl كما هي) ...

export function MediaRenderer({ url, alt = "" }: Props) {
  // ... (منطق YouTube كما هو) ...

  // 2. تيرابوكس
  const tbShareId = getTeraboxShareId(url);
  if (tbShareId) {
    const [direct, setDirect] = useState<{ type: "video" | "image"; url: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
      let cancelled = false;
      setLoading(true);
      setError(false);
      fetchTeraboxDirectUrl(url)
        .then((result) => {
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

    if (loading) { /* ... */ }
    if (error) { /* ... */ }
    if (direct?.type === "video") {
      // ✅ التعديل المهم: استخدم iframe
      return (
        <div className="relative w-full overflow-hidden rounded-lg shadow-mystic border border-gold/30 bg-black" style={{ aspectRatio: "16/9" }}>
          <iframe
            src={direct.url}  // الرابط المباشر من الـ Worker
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }
    
    if (loading) {
      return (
        <div className="w-full rounded-lg shadow-mystic border border-gold/30 bg-black/20 flex items-center justify-center p-8" style={{ aspectRatio: "16/9" }}>
          <span className="text-gold/70 text-sm">جاري تحميل الوسائط من Terabox...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="w-full rounded-lg shadow-mystic border border-gold/30 bg-black/20 flex items-center justify-center p-8" style={{ aspectRatio: "16/9" }}>
          <span className="text-red-400/70 text-sm">حدث خطأ في تحميل الوسائط من Terabox</span>
        </div>
      );
    }

    if (direct?.type === "video") {
      return (
        <video
          src={direct.url}
          controls
          className="w-full rounded-lg shadow-mystic border border-gold/30 bg-black"
        />
      );
    }

    if (direct?.type === "image") {
      return (
        <img
          src={direct.url}
          alt={alt}
          loading="lazy"
          className="w-full rounded-lg shadow-mystic border border-gold/30 object-cover"
        />
      );
    }

    // Fallback في حالة فشل API
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

  // 3. ملف فيديو مباشر (mp4, webm, إلخ)
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
