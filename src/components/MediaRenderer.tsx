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

// جلب الرابط المُتوسط مع دعم التوسيط
async function getStreamTapeProxiedUrl(shareUrl: string): Promise<string | null> {
  try {
    const infoRes = await fetch(`/.netlify/functions/streamtape?url=${encodeURIComponent(shareUrl)}`);
    const infoData = await infoRes.json();
    if (!infoData.success) return null;
    // استخدام الرابط المباشر (نأمل أن يدعم التقديم)
    return infoData.direct_url;
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

  useEffect(() => {
    setVideoSrc(null);
    setError(false);
    if (!url) return;

    // YouTube
    const ytId = getYouTubeId(url);
    if (ytId) {
      setVideoSrc(`https://www.youtube.com/embed/${ytId}`);
      return;
    }

    // StreamTape
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

    // روابط مباشرة
    if (/\.(mp4|webm|mov|ogg)/i.test(url)) {
      setVideoSrc(url);
      return;
    }

    setError(true);
  }, [url]);

  // تهيئة Plyr
  useEffect(() => {
    if (!videoRef.current || !videoSrc) return;
    if (playerRef.current) playerRef.current.destroy();

    playerRef.current = new Plyr(videoRef.current, {
      controls: [
        "play-large", "play", "progress", "current-time", "duration",
        "mute", "volume", "captions", "settings", "pip", "airplay", "fullscreen",
      ],
      disableContextMenu: true,
      seekTime: 10,
      speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
      download: false,
    });

    return () => {
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [videoSrc]);

  if (loading) {
    return (
      <div className="w-full rounded-lg border border-gold/30 bg-black/20 flex items-center justify-center p-8" style={{ aspectRatio: "16/9" }}>
        <span className="text-gold/70 text-sm">جاري تجهيز الفيديو...</span>
      </div>
    );
  }

  if (error || !videoSrc) {
    return (
      <div className="w-full rounded-lg border border-gold/30 bg-black/20 flex flex-col items-center justify-center gap-2 p-8" style={{ aspectRatio: "16/9" }}>
        <span className="text-red-400/70 text-sm">لا يمكن عرض الفيديو</span>
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-gold text-xs underline">
          فتح الرابط ↗
        </a>
      </div>
    );
  }

  if (videoSrc.includes("youtube.com/embed")) {
    return (
      <div className="relative w-full overflow-hidden rounded-lg border border-gold/30" style={{ aspectRatio: "16/9" }}>
        <iframe src={videoSrc} className="absolute inset-0 w-full h-full" allowFullScreen />
      </div>
    );
  }

  return (
    <div className="w-full rounded-lg border border-gold/30 bg-black overflow-hidden">
      <video ref={videoRef} className="plyr-react plyr w-full" playsInline crossOrigin="anonymous">
        <source src={videoSrc} type="video/mp4" />
      </video>
    </div>
  );
}
