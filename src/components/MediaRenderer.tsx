"use client";

import { useEffect, useState } from "react";
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

function getGoogleDriveEmbedUrl(url: string): string | null {
  const matchFile = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchFile) return `https://drive.google.com/file/d/${matchFile[1]}/preview`;
  const matchOpen = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchOpen) return `https://drive.google.com/file/d/${matchOpen[1]}/preview`;
  return null;
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

// ------------------- المكون الرئيسي (بدون أي إضافات) -------------------
interface MediaRendererProps {
  url?: string;
  alt?: string;
  videoAspect?: VideoAspect;
}

export function MediaRenderer({ url, alt = "", videoAspect = "auto" }: MediaRendererProps) {
  const [finalSrc, setFinalSrc] = useState<string | null>(null);
  const [isIframe, setIsIframe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setFinalSrc(null);
      setIsIframe(false);
      setError(false);
      if (!url) return;

      // YouTube
      const yt = getYouTubeId(url);
      if (yt) {
        setFinalSrc(`https://www.youtube.com/embed/${yt}`);
        setIsIframe(true);
        return;
      }

      // Google Drive
      if (isGoogleDriveUrl(url)) {
        const embed = getGoogleDriveEmbedUrl(url);
        if (embed) {
          setFinalSrc(embed);
          setIsIframe(true);
          return;
        }
        setError(true);
        return;
      }

      // StreamTape
      if (isStreamTapeUrl(url)) {
        setLoading(true);
        const src = await getStreamTapeProxiedUrl(url);
        if (src && mounted) setFinalSrc(src);
        else if (mounted) setError(true);
        setLoading(false);
        return;
      }

      // روابط مباشرة
      if (/\.(mp4|webm|mov|ogg)$/i.test(url)) {
        setFinalSrc(url);
        return;
      }

      // صور
      if (/\.(jpg|jpeg|png|gif|webp|avif)$/i.test(url)) {
        setFinalSrc(url);
        return;
      }

      setError(true);
    };
    load();
    return () => { mounted = false; };
  }, [url]);

  if (loading) return <div className="p-8 text-center text-gold">جاري التحميل...</div>;
  if (error || !finalSrc) return <div className="p-8 text-center text-red-400">لا يمكن عرض المحتوى. <a href={url} target="_blank" rel="noopener noreferrer">فتح الرابط ↗</a></div>;

  // iframe (YouTube, Drive)
  if (isIframe) {
    let containerStyle: React.CSSProperties = {};
    if (videoAspect === "landscape") containerStyle = { aspectRatio: '16/9' };
    else if (videoAspect === "portrait") containerStyle = { aspectRatio: '9/16', maxHeight: '80vh', margin: '0 auto' };
    else containerStyle = { width: '100%', height: 'auto', minHeight: '300px' };

    return (
      <div className="w-full rounded-lg border border-gold/20 bg-black overflow-hidden">
        <div style={containerStyle}>
          <iframe
            src={finalSrc}
            className="w-full h-full border-0"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>
      </div>
    );
  }

  // الصور
  if (/\.(jpg|jpeg|png|gif|webp|avif)$/i.test(finalSrc)) {
    return <img src={finalSrc} alt={alt} className="w-full rounded-lg border border-gold/20" />;
  }

  // الفيديو المباشر (بدون أي إضافات، فقط controls)
  let videoStyle: React.CSSProperties = { width: '100%', height: 'auto' };
  if (videoAspect === "portrait") videoStyle = { height: '80vh', width: 'auto', margin: '0 auto' };

  return (
    <div className="w-full bg-black rounded-lg border border-gold/20 overflow-hidden">
      <video
        src={finalSrc}
        style={videoStyle}
        controls
        playsInline
        className="w-full h-auto"
      >
        متصفحك لا يدعم الفيديو.
      </video>
    </div>
  );
}
