"use client";

import { useEffect, useRef, useState } from "react";
import type { VideoAspect } from "@/lib/articles";

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

function isGoogleDriveUrl(url: string): boolean {
  return /drive\.google\.com\/(file\/d\/|open\?id=)/i.test(url);
}

function getGoogleDriveDirectUrl(url: string): string | null {
  let fileId: string | null = null;
  const matchFile = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchFile) {
    fileId = matchFile[1];
  } else {
    const matchOpen = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (matchOpen) fileId = matchOpen[1];
  }
  if (!fileId) return null;
  return `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`;
}

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
interface MediaRendererProps {
  url?: string;
  alt?: string;
  videoAspect?: VideoAspect;
}

export function MediaRenderer({ url, alt = "", videoAspect = "auto" }: MediaRendererProps) {
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  // تحديد مصدر المحتوى
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

    // Google Drive -> رابط مباشر
    if (isGoogleDriveUrl(url)) {
      const directUrl = getGoogleDriveDirectUrl(url);
      if (directUrl) {
        setVideoSrc(directUrl);
        return;
      } else {
        setError(true);
        return;
      }
    }

    // StreamTape
    if (isStreamTapeUrl(url)) {
      setLoading(true);
      getStreamTapeProxiedUrl(url)
        .then(src => src ? setVideoSrc(src) : setError(true))
        .catch(() => setError(true))
        .finally(() => setLoading(false));
      return;
    }

    // روابط مباشرة للفيديو
    if (/\.(mp4|webm|mov|ogg)/i.test(url)) {
      setVideoSrc(url);
      return;
    }

    // صور
    if (/\.(jpg|jpeg|png|gif|webp|avif)/i.test(url)) {
      setVideoSrc(url);
      return;
    }

    setError(true);
  }, [url]);

  if (loading) return <div className="p-8 text-center text-gold">جاري تجهيز الفيديو...</div>;
  if (error || !videoSrc) return <div className="p-8 text-center text-red-400">لا يمكن عرض المحتوى. <a href={url} target="_blank" rel="noopener noreferrer" className="underline">فتح الرابط ↗</a></div>;

  // YouTube iframe
  if (videoSrc.includes('youtube.com/embed')) {
    return (
      <div className="w-full rounded-lg border border-gold/20 bg-black overflow-hidden">
        <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
          <iframe
            src={videoSrc}
            className="absolute inset-0 w-full h-full"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>
      </div>
    );
  }

  // الصور
  if (/\.(jpg|jpeg|png|gif|webp|avif)/i.test(videoSrc)) {
    return <img src={videoSrc} alt={alt} className="w-full rounded-lg border border-gold/20" />;
  }

  // --- الفيديو المباشر (MP4, StreamTape, Google Drive) مع التحكم في التنسيق ---
  
  // تحديد الأنماط حسب videoAspect
  let containerClassName = "w-full bg-black rounded-lg border border-gold/20 overflow-hidden flex justify-center";
  let videoClassName = "block object-contain max-w-full max-h-[80vh]";
  
  if (videoAspect === "landscape") {
    containerClassName = "w-full bg-black rounded-lg border border-gold/20 overflow-hidden";
    videoClassName = "w-full h-auto object-contain";
  } else if (videoAspect === "portrait") {
    containerClassName = "w-full bg-black rounded-lg border border-gold/20 overflow-hidden flex justify-center";
    videoClassName = "h-auto max-h-[80vh] w-auto max-w-full object-contain";
  } else {
    // auto
    containerClassName = "w-full bg-black rounded-lg border border-gold/20 overflow-hidden flex justify-center";
    videoClassName = "block object-contain max-w-full max-h-[80vh]";
  }

  return (
    <div className={containerClassName}>
      <video
        className={videoClassName}
        controls
        playsInline
        preload="metadata"
      >
        <source src={videoSrc} type="video/mp4" />
        متصفحك لا يدعم تشغيل الفيديو.
      </video>
    </div>
  );
}
