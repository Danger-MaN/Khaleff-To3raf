// MediaRenderer.tsx
"use client";

import { useState, useEffect } from "react";

interface Props {
  url?: string;
  alt?: string;
}

// دالة استخراج معرف يوتيوب
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

// دالة استخراج معرّف المشاركة من تيرابوكس
function getTeraboxShareId(url: string): string | null {
  const teraboxDomains = /(terabox|teraboxapp|terabox\.app|1024terabox|dubox|4funbox|mirrobox|nephobox|momerybox|tibibox|sharebox)\./i;
  if (!teraboxDomains.test(url)) return null;
  
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

// 🔹 الخيار 1: استخدام iframe جاهز (موصى به، يعمل فورًا)
function getTeraboxIframeUrl(shareUrl: string): string {
  // مشغل يعمل حاليًا بدون CORS
  return `https://sannjay.tech/TeraBox/player.html?url=${encodeURIComponent(shareUrl)}`;
}

// 🔹 الخيار 2: استخدام API وتحويل إلى فيديو مباشر (يتطلب وكيل CORS، جاهز للتعديل)
// إذا أردت تفعيله، قم بتعيين USE_API_PROXY = true
const USE_API_PROXY = false; // غيّر إلى true إذا كان لديك وكيل خاص
const TERABOX_WORKER = "https://terabox.dangerhelp10.workers.dev"; // رابط الوكيل الخاص بك

async function fetchTeraboxDirectUrl(shareUrl: string): Promise<string | null> {
  if (!USE_API_PROXY) return null;
  try {
    const res = await fetch(`${TERABOX_WORKER}?url=${encodeURIComponent(shareUrl)}`);
    const data = await res.json();
    if (data.success && data.type === "video") {
      return data.streaming_url;
    }
    return null;
  } catch (err) {
    console.error("Terabox API error:", err);
    return null;
  }
}

export function MediaRenderer({ url, alt = "" }: Props) {
  if (!url) return null;

  // 1. يوتيوب
  const ytId = getYouTubeId(url);
  if (ytId) {
    return (
      <div className="relative w-full overflow-hidden rounded-lg shadow-mystic border border-gold/30" style={{ aspectRatio: "16/9" }}>
        <iframe
          src={`https://www.youtube.com/embed/${ytId}`}
          title="YouTube video"
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  // 2. تيرابوكس
  const tbShareId = getTeraboxShareId(url);
  if (tbShareId) {
    // استخدام iframe الجاهز (الحل الأساسي)
    const iframeSrc = getTeraboxIframeUrl(url);

    // إذا أردت تجربة API المباشر (مع وكيل)، يمكن تفعيله أدناه
    if (USE_API_PROXY) {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const [directUrl, setDirectUrl] = useState<string | null>(null);
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const [loading, setLoading] = useState(true);

      // eslint-disable-next-line react-hooks/rules-of-hooks
      useEffect(() => {
        fetchTeraboxDirectUrl(url).then((videoUrl) => {
          setDirectUrl(videoUrl);
          setLoading(false);
        });
      }, [url]);

      if (loading) {
        return (
          <div className="w-full rounded-lg shadow-mystic border border-gold/30 bg-black/20 flex items-center justify-center p-8" style={{ aspectRatio: "16/9" }}>
            <span className="text-gold/70 text-sm">جاري تحميل الفيديو...</span>
          </div>
        );
      }

      if (directUrl) {
        return (
          <video
            controls
            className="w-full rounded-lg shadow-mystic border border-gold/30 bg-black"
            style={{ aspectRatio: "16/9" }}
          >
            <source src={directUrl} type="video/mp4" />
            متصفحك لا يدعم الفيديو.
          </video>
        );
      }
      // إذا فشل API، نستخدم iframe الاحتياطي
    }

    // العرض الأساسي: iframe الجاهز (يعمل بدون مشاكل)
    return (
      <div className="relative w-full overflow-hidden rounded-lg shadow-mystic border border-gold/30 bg-black" style={{ aspectRatio: "16/9" }}>
        <iframe
          src={iframeSrc}
          title="Terabox video player"
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="no-referrer"
        />
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-2 end-2 text-[10px] uppercase tracking-widest px-2 py-1 rounded bg-background/70 text-gold border border-gold/30 hover:bg-background z-10"
        >
          Terabox ↗
        </a>
      </div>
    );
  }

  // 3. فيديو مباشر (mp4, webm, إلخ)
  if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(url)) {
    return (
      <video controls className="w-full rounded-lg shadow-mystic border border-gold/30 bg-black">
        <source src={url} />
      </video>
    );
  }

  // 4. صورة مباشرة
  if (/\.(jpe?g|png|webp|gif|avif|svg)(\?|$)/i.test(url) || /^https?:\/\//.test(url)) {
    return <img src={url} alt={alt} loading="lazy" className="w-full rounded-lg shadow-mystic border border-gold/30 object-cover" />;
  }

  return null;
}
