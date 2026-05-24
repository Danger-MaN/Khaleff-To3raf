"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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

  useEffect(() => {
    setVideoSrc(null);
    setError(false);
    if (!url) return;

    const ytId = getYouTubeId(url);
    if (ytId) {
      setVideoSrc(`https://www.youtube.com/embed/${ytId}`);
      return;
    }

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

    if (isStreamTapeUrl(url)) {
      setLoading(true);
      getStreamTapeProxiedUrl(url)
        .then(src => src ? setVideoSrc(src) : setError(true))
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

  if (loading) return <div className="p-8 text-center text-gold">جاري تجهيز الفيديو...</div>;
  if (error || !videoSrc) return <div className="p-8 text-center text-red-400">لا يمكن عرض المحتوى. <a href={url} target="_blank" rel="noopener noreferrer" className="underline">فتح الرابط ↗</a></div>;

  // YouTube
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

  // Google Drive
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

  // الصور
  if (/\.(jpg|jpeg|png|gif|webp|avif)/i.test(videoSrc)) {
    return <img src={videoSrc} alt={alt} className="w-full rounded-lg border border-gold/20" />;
  }

  // ---------- الفيديو المباشر: عنصر فيديو عادي مع CSS بسيط جداً ----------
  const isPortrait = videoAspect === "portrait";
  const isLandscape = videoAspect === "landscape";

  let videoStyle: React.CSSProperties = {
    display: 'block',
    maxWidth: '100%',
  };

  if (isPortrait) {
    videoStyle = {
      ...videoStyle,
      maxHeight: '80vh',
      width: 'auto',
      height: 'auto',
      margin: '0 auto',
    };
  } else if (isLandscape) {
    videoStyle = {
      ...videoStyle,
      width: '100%',
      height: 'auto',
    };
  } else {
    // auto
    videoStyle = {
      ...videoStyle,
      width: '100%',
      height: 'auto',
    };
  }

  return (
    <div className="w-full rounded-lg border border-gold/20 bg-black overflow-hidden">
      <div className="flex justify-center">
        <video
          src={videoSrc}
          controls
          playsInline
          preload="metadata"
          style={videoStyle}
        >
          متصفحك لا يدعم تشغيل الفيديو.
        </video>
      </div>
    </div>
  );
}
