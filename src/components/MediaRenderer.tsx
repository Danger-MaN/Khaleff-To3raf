"use client";

import { useState, useEffect } from "react";
import ReactPlayer from "react-player";
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

function isTeraboxUrl(url: string): boolean {
  return /(terabox|1024terabox|teraboxapp|dubox|4funbox)\./i.test(url);
}

function isGoogleDriveUrl(url: string): boolean {
  return /drive\.google\.com\/(file\/d\/|open\?id=)/i.test(url);
}

function getGoogleDriveEmbedUrl(url: string): string | null {
  let fileId: string | null = null;
  const matchFile = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchFile) {
    fileId = matchFile[1];
  } else {
    const matchOpen = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (matchOpen) fileId = matchOpen[1];
  }
  if (!fileId) return null;
  return `https://drive.google.com/file/d/${fileId}/preview`;
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
  const [isClient, setIsClient] = useState(false);

  // تجنب مشكلة Hydration في Next.js
  useEffect(() => {
    setIsClient(true);
  }, []);

  // تحديد مصدر المحتوى
  useEffect(() => {
    setVideoSrc(null);
    setError(false);
    if (!url) return;

    // YouTube
    const ytId = getYouTubeId(url);
    if (ytId) {
      setVideoSrc(url);
      return;
    }

    // Google Drive
    if (isGoogleDriveUrl(url)) {
      const embedUrl = getGoogleDriveEmbedUrl(url);
      if (embedUrl) {
        setVideoSrc(embedUrl);
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

    // Terabox (غير مدعوم حالياً)
    if (isTeraboxUrl(url)) {
      setError(true);
      return;
    }

    // روابط مباشرة (mp4, webm, mov, ogg)
    if (/\.(mp4|webm|mov|ogg)/i.test(url)) {
      setVideoSrc(url);
      return;
    }

    // الصور
    if (/\.(jpg|jpeg|png|gif|webp|avif)/i.test(url)) {
      setVideoSrc(url);
      return;
    }

    setError(true);
  }, [url]);

  if (loading) return <div className="p-8 text-center text-gold">جاري تجهيز الفيديو...</div>;
  if (error || !videoSrc) return <div className="p-8 text-center text-red-400">لا يمكن عرض المحتوى. <a href={url} target="_blank" rel="noopener noreferrer" className="underline">فتح الرابط ↗</a></div>;

  // الصور
  if (/\.(jpg|jpeg|png|gif|webp|avif)/i.test(videoSrc)) {
    return <img src={videoSrc} alt={alt} className="w-full rounded-lg border border-gold/20" />;
  }

  // تحديد أبعاد الفيديو بناءً على videoAspect
  let playerWidth: string | number = "100%";
  let playerHeight: string | number = "auto";

  if (videoAspect === "portrait") {
    playerWidth = "auto";
    playerHeight = "80vh";
  } else if (videoAspect === "landscape") {
    playerWidth = "100%";
    playerHeight = "auto";
  } else {
    // auto
    playerWidth = "100%";
    playerHeight = "auto";
  }

  // منع الـ Hydration mismatch
  if (!isClient) {
    return <div className="w-full rounded-lg border border-gold/20 bg-black" style={{ minHeight: '200px' }} />;
  }

  // Google Drive (iframe)
  if (videoSrc.includes('drive.google.com/file/d/')) {
    let containerStyle: React.CSSProperties = { width: '100%', height: 'auto' };
    if (videoAspect === "portrait") {
      containerStyle = { aspectRatio: '9/16', maxHeight: '80vh', width: 'auto', margin: '0 auto' };
    } else if (videoAspect === "landscape") {
      containerStyle = { aspectRatio: '16/9', maxWidth: '100%' };
    }
    return (
      <div className="w-full rounded-lg border border-gold/20 bg-black overflow-hidden">
        <div style={containerStyle} className="relative w-full">
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

  // ReactPlayer لجميع الفيديوهات الأخرى
  return (
    <div className="w-full rounded-lg border border-gold/20 bg-black overflow-hidden flex justify-center">
      <ReactPlayer
        url={videoSrc}
        width={playerWidth}
        height={playerHeight}
        controls={true}
        playing={false}
        config={{
          youtube: {
            playerVars: { modestbranding: 1, rel: 0 },
          },
          file: {
            attributes: {
              controlsList: 'nodownload', // منع التحميل المباشر
            },
          },
        }}
      />
    </div>
  );
}
