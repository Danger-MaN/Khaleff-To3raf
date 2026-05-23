"use client";

import { useEffect, useRef, useState } from "react";
import Plyr from "plyr";
import "plyr/dist/plyr.css";

// ------------------- دوال مساعدة -------------------
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

function isStreamTapeUrl(url: string): boolean {
  return /streamtape\.com/i.test(url);
}

function isTeraboxUrl(url: string): boolean {
  return /(terabox|1024terabox|teraboxapp|dubox|4funbox)\./i.test(url);
}

// ------------------- جلب الرابط المُتوسط من الدالة -------------------
async function getStreamTapeProxiedUrl(shareUrl: string): Promise<string | null> {
  try {
    // 1. اطلب الرابط المباشر من الدالة
    const infoRes = await fetch(`/.netlify/functions/streamtape?url=${encodeURIComponent(shareUrl)}`);
    const infoData = await infoRes.json();
    if (!infoData.success) return null;
    // 2. أرجع رابط الدالة مع direct=1 لتوسيط الفيديو
    return `/.netlify/functions/streamtape?direct=1&url=${encodeURIComponent(shareUrl)}`;
  } catch (err) {
    console.error("getStreamTapeProxiedUrl error:", err);
    return null;
  }
}

// ------------------- المكون الرئيسي -------------------
export function MediaRenderer({ url, alt = "" }: { url?: string; alt?: string }) {
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<Plyr | null>(null);

  // Reset when url changes
  useEffect(() => {
    setVideoSrc(null);
    setError(false);
    if (!url) return;

    // 1. YouTube
    const ytId = getYouTubeId(url);
    if (ytId) {
      setVideoSrc(`https://www.youtube.com/embed/${ytId}`);
      return;
    }

    // 2. StreamTape
    if (isStreamTapeUrl(url)) {
      setLoading(true);
      getStreamTapeProxiedUrl(url)
        .then(src => {
          if (src) setVideoSrc(src);
          else setError(true);
        })
        .catch(() => setError(true))
        .finally(() => setLoading(false));
      return;
    }

    // 3. Terabox – يمكن إضافة دالة مشابهة له لو أردت
    if (isTeraboxUrl(url)) {
      // هنا يمكنك استدعاء دالة terabox القديمة
      setError(true);
      return;
    }

    // 4. روابط مباشرة (mp4, webm, ...)
    if (/\.(mp4|webm|mov|ogg)/i.test(url)) {
      setVideoSrc(url);
      return;
    }

    // 5. صور
    if (/\.(jpg|jpeg|png|gif|webp|avif)/i.test(url)) {
      setVideoSrc(url);
      return;
    }

    setError(true);
  }, [url]);

  // تهيئة Plyr عند تحميل مصدر الفيديو
  useEffect(() => {
    if (!videoRef.current || !videoSrc) return;
    if (playerRef.current) playerRef.current.destroy();

    // إعدادات Plyr المتقدمة
    playerRef.current = new Plyr(videoRef.current, {
      controls: [
        "play-large",   // زر التشغيل الكبير
        "play",         // زر التشغيل الصغير
        "progress",     // شريط التقدم
        "current-time", // الوقت الحالي
        "duration",     // المدة الكلية
        "mute",         // كتم الصوت
        "volume",       // التحكم بالصوت
        "captions",     // الترجمة (إذا وجدت)
        "settings",     // إعدادات الجودة والسرعة
        "pip",          // Picture-in-Picture
        "airplay",      // AirPlay
        "fullscreen",   // ملء الشاشة
      ],
      // منع قائمة السياق (يمنع التحميل بالزر الأيمن)
      disableContextMenu: true,
      // مقدار التقديم/التأخير بالثواني عند الضغط على أزرار السهم (إن وجدت)
      seekTime: 10,
      // تفعيل جودة الفيديو (إذا كان المصدر HLS)
      quality: {
        default: 720,
        options: [1080, 720, 480, 360],
        forced: true,
        onChange: (quality) => console.log(`Quality changed to ${quality}p`),
      },
      // سرعة التشغيل
      speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
      // لا تُظهر زر التحميل (إذا كان المتصفح يوفره)
      download: false,
    });

    return () => {
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [videoSrc]);

  // عرض حالة التحميل أو الخطأ
  if (loading) return <div className="p-8 text-center">جاري تجهيز الفيديو...</div>;
  if (error || !videoSrc) {
    return (
      <div className="p-8 text-center text-red-400">
        لا يمكن عرض الفيديو.{" "}
        <a href={url} target="_blank" rel="noopener noreferrer">
          فتح الرابط ↗
        </a>
      </div>
    );
  }

  // عرض يوتيوب (iframe) أو فيديو عادي
  const isYouTube = videoSrc.includes("youtube.com/embed");
  if (isYouTube) {
    return (
      <div
        style={{ aspectRatio: "16/9" }}
        className="relative w-full rounded-lg border border-gold/30 overflow-hidden"
      >
        <iframe
          src={videoSrc}
          className="absolute inset-0 w-full h-full"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
      </div>
    );
  }

  // صور
  if (/\.(jpg|jpeg|png|gif|webp|avif)/i.test(videoSrc)) {
    return <img src={videoSrc} alt={alt} className="w-full rounded-lg border border-gold/30" />;
  }

  // فيديو (مع Plyr)
  return (
    <div className="w-full rounded-lg border border-gold/30 bg-black overflow-hidden">
      <video ref={videoRef} className="plyr-react plyr" playsInline crossOrigin="anonymous">
        <source src={videoSrc} type="video/mp4" />
        {/* إضافة ملف الفصول (Chapters) إذا كان لديك */}
        <track kind="chapters" src="/chapters.vtt" default />
        متصفحك لا يدعم تشغيل الفيديو.
      </video>
    </div>
  );
}
