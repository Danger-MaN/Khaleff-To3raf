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

// ------------------- جلب الرابط المُتوسط -------------------
async function getStreamTapeProxiedUrl(shareUrl: string): Promise<string | null> {
  try {
    const infoRes = await fetch(`/.netlify/functions/streamtape?url=${encodeURIComponent(shareUrl)}`);
    const infoData = await infoRes.json();
    if (!infoData.success) return null;
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

  // Reset and fetch when url changes
  useEffect(() => {
    setVideoSrc(null);
    setError(false);
    if (!url) return;

    const ytId = getYouTubeId(url);
    if (ytId) {
      setVideoSrc(`https://www.youtube.com/embed/${ytId}`);
      return;
    }

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

    if (isTeraboxUrl(url)) {
      setError(true);
      return;
    }

    if (/\.(mp4|webm|mov|ogg)/i.test(url)) {
      setVideoSrc(url);
      return;
    }

    if (/\.(jpg|jpeg|png|gif|webp|avif)/i.test(url)) {
      setVideoSrc(url);
      return;
    }

    setError(true);
  }, [url]);

  // Initialize Plyr when video source is ready
  useEffect(() => {
    if (!videoRef.current || !videoSrc) return;
    if (playerRef.current) playerRef.current.destroy();

    const initializePlayer = () => {
      if (!videoRef.current) return;
      
      playerRef.current = new Plyr(videoRef.current, {
        controls: [
            "play-large",   // زر التشغيل الكبير (في منتصف الشاشة)
            "play",         // زر التشغيل الصغير
            "progress",     // شريط التقدم (Seeking)
            "current-time", // الوقت الحالي
            "duration",     // المدة الكلية
            "mute",         // زر كتم الصوت (بدون مؤشر مستوى الصوت)
            "captions",     // الترجمة (إذا وجدت)
            "settings",     // إعدادات الجودة والسرعة
            "pip",          // Picture-in-Picture
            "airplay",      // AirPlay
            "fullscreen",   // ملء الشاشة
        ],
        disableContextMenu: true,
        seekTime: 10,
        quality: {
          default: 720,
          options: [1080, 720, 480, 360],
          forced: true,
        },
        speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
        download: false,
      });
    };

    // تأكد من تحميل بيانات الفيديو بالكامل لتجنب مشاكل التقديم
    if (videoRef.current.readyState >= 1) {
      initializePlayer();
    } else {
      videoRef.current.addEventListener('loadedmetadata', initializePlayer, { once: true });
    }

    return () => {
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [videoSrc]);

  // Loading state
  if (loading) {
    return <div className="p-8 text-center text-gold">جاري تجهيز الفيديو...</div>;
  }

  // Error state
  if (error || !videoSrc) {
    return (
      <div className="p-8 text-center text-red-400">
        لا يمكن عرض الفيديو.{" "}
        <a href={url} target="_blank" rel="noopener noreferrer" className="underline">
          فتح الرابط ↗
        </a>
      </div>
    );
  }

  // YouTube
  if (videoSrc.includes("youtube.com/embed")) {
    return (
      <div style={{ aspectRatio: "16/9" }} className="relative w-full rounded-lg border border-gold/30 overflow-hidden">
        <iframe
          src={videoSrc}
          className="absolute inset-0 w-full h-full"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
      </div>
    );
  }

  // Images
  if (/\.(jpg|jpeg|png|gif|webp|avif)/i.test(videoSrc)) {
    return <img src={videoSrc} alt={alt} className="w-full rounded-lg border border-gold/30" />;
  }

  // Video with Plyr
  return (
    <div className="w-full rounded-lg border border-gold/30 bg-black overflow-hidden">
      <video
        ref={videoRef}
        className="plyr-react plyr w-full"
        playsInline
        crossOrigin="anonymous"
        controls // Fallback للمتصفحات القديمة
      >
        <source src={videoSrc} type="video/mp4" />
        {/* أضف ملف الفصول هنا إذا كان موجوداً */}
        {/* <track kind="chapters" src="/chapters.vtt" default /> */}
        متصفحك لا يدعم تشغيل الفيديو.
      </video>
    </div>
  );
}
