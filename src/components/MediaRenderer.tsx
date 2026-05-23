"use client";

import { useState, useEffect } from "react";

interface MediaRendererProps {
  url?: string;
  alt?: string;
}

// ==================== دوال مساعدة ====================

// استخراج معرف يوتيوب من الرابط
function getYouTubeId(url: string): string | null {
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// استخراج معرف المشاركة (surl) من رابط Terabox
function getTeraboxShareId(url: string): string | null {
  const teraboxDomains = /(terabox|teraboxapp|terabox\.app|1024terabox|dubox|4funbox|mirrobox|nephobox|momerybox|tibibox|sharebox)\./i;
  if (!teraboxDomains.test(url)) return null;

  const patterns = [
    /[?&]surl=([a-zA-Z0-9_-]+)/,
    /\/s\/1?([a-zA-Z0-9_-]+)/,
    /\/sharing\/link\?surl=([a-zA-Z0-9_-]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// ==================== الاتصال بـ Cloudflare Worker ====================

// رابط الـ Worker الخاص بك (يمكن تغييره حسب الحاجة)
const TERABOX_WORKER = "https://terabox.dangerhelp10.workers.dev";

// جلب رابط الفيديو المُتوسط (proxy_url) الذي يمكن عرضه مباشرة في <video>
async function fetchTeraboxVideoUrl(shareUrl: string): Promise<string | null> {
  try {
    const response = await fetch(`${TERABOX_WORKER}?url=${encodeURIComponent(shareUrl)}`);
    const data = await response.json();
    
    // نتوقع رداً بالشكل: { success: true, proxy_url: "https://..." }
    if (data.success && data.proxy_url) {
      return data.proxy_url;
    }
    console.error("Terabox worker returned an invalid response:", data);
    return null;
  } catch (error) {
    console.error("Error calling Terabox worker:", error);
    return null;
  }
}

// ==================== المكون الرئيسي ====================

export function MediaRenderer({ url, alt = "" }: MediaRendererProps) {
  if (!url) return null;

  // 1. روابط يوتيوب
  const youtubeId = getYouTubeId(url);
  if (youtubeId) {
    return (
      <div
        className="relative w-full overflow-hidden rounded-lg shadow-mystic border border-gold/30"
        style={{ aspectRatio: "16/9" }}
      >
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}`}
          title="YouTube video player"
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  // 2. روابط Terabox
  const teraboxShareId = getTeraboxShareId(url);
  if (teraboxShareId) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [loading, setLoading] = useState<boolean>(true);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [error, setError] = useState<boolean>(false);

    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      let isMounted = true;
      setLoading(true);
      setError(false);
      setVideoUrl(null);

      fetchTeraboxVideoUrl(url)
        .then((result) => {
          if (isMounted) {
            if (result) setVideoUrl(result);
            else setError(true);
            setLoading(false);
          }
        })
        .catch(() => {
          if (isMounted) {
            setError(true);
            setLoading(false);
          }
        });

      return () => {
        isMounted = false;
      };
    }, [url]);

    if (loading) {
      return (
        <div
          className="w-full rounded-lg shadow-mystic border border-gold/30 bg-black/20 flex items-center justify-center p-8"
          style={{ aspectRatio: "16/9" }}
        >
          <span className="text-gold/70 text-sm">جاري تحميل الفيديو من Terabox...</span>
        </div>
      );
    }

    if (error || !videoUrl) {
      return (
        <div
          className="w-full rounded-lg shadow-mystic border border-gold/30 bg-black/20 flex flex-col items-center justify-center gap-2 p-8"
          style={{ aspectRatio: "16/9" }}
        >
          <span className="text-red-400/70 text-sm">فشل تحميل الفيديو من Terabox</span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gold text-xs underline"
          >
            فتح الرابط في Terabox ↗
          </a>
        </div>
      );
    }

    // عرض الفيديو عبر عنصر <video> مع المصدر المُتوسط
    return (
      <video
        key={videoUrl}
        controls
        className="w-full rounded-lg shadow-mystic border border-gold/30 bg-black"
        style={{ aspectRatio: "16/9" }}
      >
        <source src={videoUrl} type="video/mp4" />
        متصفحك لا يدعم تشغيل الفيديو.
      </video>
    );
  }

  // 3. روابط فيديو مباشرة (mp4, webm, mov, etc.)
  if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(url)) {
    return (
      <video
        controls
        className="w-full rounded-lg shadow-mystic border border-gold/30 bg-black"
        style={{ aspectRatio: "16/9" }}
      >
        <source src={url} />
      </video>
    );
  }

  // 4. روابط صور مباشرة
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
