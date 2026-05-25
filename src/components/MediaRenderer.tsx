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

function isTeraboxUrl(url: string): boolean {
  return /(terabox|1024terabox|teraboxapp|dubox|4funbox)\./i.test(url);
}

function isGoogleDriveUrl(url: string): boolean {
  return /drive\.google\.com\/(file\/d\/|open\?id=)/i.test(url);
}

function getGoogleDriveFileId(url: string): string | null {
  const matchFile = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchFile) return matchFile[1];
  const matchOpen = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchOpen) return matchOpen[1];
  return null;
}

// رابط iframe لـ Google Drive (يعمل دائماً)
function getGoogleDriveEmbedUrl(url: string): string | null {
  const fileId = getGoogleDriveFileId(url);
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
  const [embedSrc, setEmbedSrc] = useState<string | null>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [contentType, setContentType] = useState<"youtube" | "drive" | "streamtape" | "image" | "video" | null>(null);

  // تحديد مصدر المحتوى
  useEffect(() => {
    let isMounted = true;
    const processUrl = async () => {
      setEmbedSrc(null);
      setVideoSrc(null);
      setError(false);
      setContentType(null);
      if (!url) return;

      // 1. YouTube (iframe)
      const ytId = getYouTubeId(url);
      if (ytId) {
        setEmbedSrc(`https://www.youtube.com/embed/${ytId}`);
        setContentType("youtube");
        return;
      }

      // 2. Google Drive (iframe - يعمل دائماً)
      if (isGoogleDriveUrl(url)) {
        const embedUrl = getGoogleDriveEmbedUrl(url);
        if (embedUrl) {
          setEmbedSrc(embedUrl);
          setContentType("drive");
          return;
        } else {
          setError(true);
          return;
        }
      }

      // 3. StreamTape (فيديو مباشر)
      if (isStreamTapeUrl(url)) {
        setLoading(true);
        const src = await getStreamTapeProxiedUrl(url);
        if (src && isMounted) {
          setVideoSrc(src);
          setContentType("streamtape");
        } else if (isMounted) {
          setError(true);
        }
        setLoading(false);
        return;
      }

      // 4. Terabox (غير مدعوم)
      if (isTeraboxUrl(url)) {
        setError(true);
        return;
      }

      // 5. روابط مباشرة للفيديو
      if (/\.(mp4|webm|mov|ogg)/i.test(url)) {
        setVideoSrc(url);
        setContentType("video");
        return;
      }

      // 6. صور
      if (/\.(jpg|jpeg|png|gif|webp|avif)/i.test(url)) {
        setVideoSrc(url);
        setContentType("image");
        return;
      }

      setError(true);
    };
    processUrl();
    return () => { isMounted = false; };
  }, [url]);

  // حالات التحميل والخطأ
  if (loading) return <div className="p-8 text-center text-gold">جاري تجهيز الفيديو...</div>;
  if (error) return <div className="p-8 text-center text-red-400">لا يمكن عرض المحتوى. <a href={url} target="_blank" rel="noopener noreferrer" className="underline">فتح الرابط ↗</a></div>;

  // --- YouTube / Google Drive (iframe) ---
  if (contentType === "youtube" || contentType === "drive") {
    let containerStyle: React.CSSProperties = {};
    if (videoAspect === "landscape") containerStyle = { aspectRatio: '16/9' };
    else if (videoAspect === "portrait") containerStyle = { aspectRatio: '9/16', maxHeight: '80vh', margin: '0 auto' };
    else containerStyle = { width: '100%', height: 'auto', minHeight: '300px' };

    return (
      <div className="w-full rounded-lg border border-gold/20 bg-black overflow-hidden">
        <div style={containerStyle} className="w-full">
          <iframe
            src={embedSrc!}
            className="w-full h-full border-0"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>
      </div>
    );
  }

  // --- الصور ---
  if (contentType === "image") {
    return <img src={videoSrc!} alt={alt} className="w-full rounded-lg border border-gold/20" />;
  }

  // --- الفيديو المباشر (StreamTape, MP4) مع أزرار المتصفح الافتراضية ---
  if (contentType === "streamtape" || contentType === "video") {
    const isPortrait = videoAspect === "portrait";
    let containerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'center' };
    let videoStyle: React.CSSProperties = { display: 'block', objectFit: 'contain', maxWidth: '100%', maxHeight: '80vh' };

    if (videoAspect === "landscape") {
      containerStyle = { aspectRatio: '16/9', maxWidth: '100%' };
      videoStyle = { width: '100%', height: '100%', objectFit: 'contain' };
    } else if (videoAspect === "portrait") {
      containerStyle = { aspectRatio: '9/16', maxHeight: '80vh', width: 'auto', margin: '0 auto' };
      videoStyle = { width: '100%', height: '100%', objectFit: 'contain' };
    }

    return (
      <div className="w-full bg-black rounded-lg border border-gold/20 overflow-hidden">
        <div style={containerStyle} className="w-full">
          <video
            src={videoSrc!}
            style={videoStyle}
            controls
            playsInline
            preload="metadata"
          >
            متصفحك لا يدعم تشغيل الفيديو.
          </video>
        </div>
      </div>
    );
  }

  return null;
}
