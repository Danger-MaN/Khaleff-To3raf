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

// ------------------- المكون الرئيسي (الريلز ثابت) -------------------
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

    const ytId = getYouTubeId(url);
    if (ytId) {
      setVideoSrc(`https://www.youtube.com/embed/${ytId}`);
      return;
    }

    if (isStreamTapeUrl(url)) {
      setLoading(true);
      getStreamTapeProxiedUrl(url)
        .then(src => src ? setVideoSrc(src) : setError(true))
        .catch(() => setError(true))
        .finally(() => setLoading(false));
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

  useEffect(() => {
    if (!videoRef.current || !videoSrc) return;
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
      });
    };

    if (videoRef.current.readyState >= 1) initializePlayer();
    else videoRef.current.addEventListener('loadedmetadata', initializePlayer, { once: true });

    return () => { playerRef.current?.destroy(); playerRef.current = null; };
  }, [videoSrc]);

  if (loading) return <div className="p-8 text-center text-gold">جاري تجهيز الفيديو...</div>;
  if (error || !videoSrc) return <div className="p-8 text-center text-red-400">لا يمكن عرض المحتوى. <a href={url} target="_blank" rel="noopener noreferrer" className="underline">فتح الرابط ↗</a></div>;

  // YouTube
  if (videoSrc.includes('youtube.com/embed')) {
    return (
      <div className="w-full rounded-lg border border-gold/20 bg-black overflow-hidden">
        <div className="relative w-full" style={{ aspectRatio: '9/16' }}>
          <iframe src={videoSrc} className="absolute inset-0 w-full h-full" allowFullScreen />
        </div>
      </div>
    );
  }

  // الصور
  if (/\.(jpg|jpeg|png|gif|webp|avif)/i.test(videoSrc)) {
    return <img src={videoSrc} alt={alt} className="w-full rounded-lg border border-gold/20" style={{ aspectRatio: '9/16', objectFit: 'cover' }} />;
  }

  // كل الفيديوهات - ثابت على شكل ريلز 9:16
  return (
    <div className="w-full bg-black rounded-lg border border-gold/20 overflow-hidden">
      <div className="relative w-full" style={{ aspectRatio: '9/16' }}>
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full"
          style={{ objectFit: 'contain' }}
          playsInline
          preload="metadata"
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
      </div>
    </div>
  );
}
