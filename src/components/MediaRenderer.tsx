"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Plyr from "plyr";
import "plyr/dist/plyr.css";
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

// ** معدلة: استخراج رابط مباشر mp4 بدلاً من رابط التضمين **
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
  // رابط التنزيل المباشر - يمكن استخدامه في عنصر video
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
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

// ------------------- مكون عرض اللقطات (لم يتغير) -------------------
interface ThumbnailStripProps {
  videoElement: HTMLVideoElement | null;
  onSeek: (time: number) => void;
  isVisible?: boolean;
}

const SEEK_INTERVAL_MS = 3000;
const THUMBNAIL_COUNT = 10;

function ThumbnailStrip({ videoElement, onSeek, isVisible = true }: ThumbnailStripProps) {
  // ... (الكود كما هو، لم يتغير، اختصاراً للعرض) ...
  // (سيتم وضعه كاملاً في الرد النهائي)
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
  const [playerReady, setPlayerReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<Plyr | null>(null);

  // تحديد مصدر المحتوى
  useEffect(() => {
    setVideoSrc(null);
    setError(false);
    setPlayerReady(false);
    if (!url) return;

    const ytId = getYouTubeId(url);
    if (ytId) {
      setVideoSrc(`https://www.youtube.com/embed/${ytId}`);
      setPlayerReady(true);
      return;
    }

    // ** تعديل: معالجة Google Drive كفيديو مباشر **
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

  // تهيئة Plyr للفيديو المباشر فقط (YouTube و Drive المحولة أصبحت فيديو مباشر)
  useEffect(() => {
    if (!videoRef.current) return;
    if (!videoSrc) return;
    // فقط YouTube يبقى iframe، أي شيء آخر (بما في ذلك Drive المباشر) نستخدم Plyr
    if (videoSrc.includes('youtube.com/embed')) return;

    if (playerRef.current) playerRef.current.destroy();

    const initializePlayer = () => {
      if (!videoRef.current) return;
      playerRef.current = new Plyr(videoRef.current, {
        controls: ["play-large", "play", "progress", "current-time", "duration", "mute", "captions", "settings", "pip", "airplay", "fullscreen"],
        disableContextMenu: true,
        seekTime: 10,
        speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
        download: false,
        storage: { enabled: true, key: 'plyr' },
      });
      setPlayerReady(true);
    };

    if (videoRef.current.readyState >= 1) initializePlayer();
    else videoRef.current.addEventListener('loadedmetadata', initializePlayer, { once: true });

    return () => { playerRef.current?.destroy(); playerRef.current = null; setPlayerReady(false); };
  }, [videoSrc]);

  const handleSeek = (time: number) => {
    if (videoRef.current) videoRef.current.currentTime = time;
  };

  if (loading) return <div className="p-8 text-center text-gold">جاري تجهيز الفيديو...</div>;
  if (error || !videoSrc) return <div className="p-8 text-center text-red-400">لا يمكن عرض المحتوى. <a href={url} target="_blank" rel="noopener noreferrer" className="underline">فتح الرابط ↗</a></div>;

  // YouTube فقط (iframe)
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

  // تحديد نمط الحاوية بناءً على videoAspect (للفيديو المباشر)
  let containerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'center' };
  let videoStyle: React.CSSProperties = { display: 'block', objectFit: 'contain', maxWidth: '100%', maxHeight: '80vh' };

  if (videoAspect === "landscape") {
    containerStyle = { aspectRatio: '16/9', maxWidth: '100%' };
    videoStyle = { width: '100%', height: '100%', objectFit: 'contain' };
  } else if (videoAspect === "portrait") {
    containerStyle = { aspectRatio: '9/16', maxHeight: '80vh', width: 'auto', margin: '0 auto' };
    videoStyle = { width: '100%', height: '100%', objectFit: 'contain' };
  } else {
    // auto: الحاوية تأخذ حجم الفيديو الأصلي
    containerStyle = { display: 'flex', justifyContent: 'center' };
    videoStyle = { display: 'block', width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' };
  }

  // الفيديو المباشر (بما في ذلك Drive الآن)
  return (
    <div className="w-full bg-black rounded-lg border border-gold/20 overflow-hidden">
      <div style={containerStyle} className="w-full">
        <video
          ref={videoRef}
          style={videoStyle}
          playsInline
          crossOrigin="anonymous"
          preload="metadata"
        >
          <source src={videoSrc} type="video/mp4" />
          متصفحك لا يدعم تشغيل الفيديو.
        </video>
      </div>
      {playerReady && (
        <div className="mt-2">
          <ThumbnailStrip
            videoElement={videoRef.current}
            onSeek={handleSeek}
            isVisible={true}
          />
        </div>
      )}
    </div>
  );
}
