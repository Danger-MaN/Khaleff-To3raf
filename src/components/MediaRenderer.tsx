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

// ------------------- مكون عرض اللقطات -------------------
interface ThumbnailStripProps {
  videoElement: HTMLVideoElement | null;
  onSeek: (time: number) => void;
  visible: boolean;
}

function ThumbnailStrip({ videoElement, onSeek, visible }: ThumbnailStripProps) {
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const THUMBNAIL_COUNT = 10; // 10 لقطات

  useEffect(() => {
    if (!videoElement || !visible) return;

    const generateThumbnails = async () => {
      setLoading(true);
      const vid = videoElement;
      const duration = vid.duration;
      if (!duration || isNaN(duration)) return;
      
      setDuration(duration);
      const thumbs: string[] = [];
      const step = duration / THUMBNAIL_COUNT;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      canvas.width = 160;  // عرض اللقطة
      canvas.height = 90;  // ارتفاع اللقطة (16:9)

      for (let i = 0; i < THUMBNAIL_COUNT; i++) {
        const time = step * i;
        vid.currentTime = time;
        
        // انتظار تحميل الإطار
        await new Promise<void>((resolve) => {
          const seekedHandler = () => {
            vid.removeEventListener('seeked', seekedHandler);
            try {
              ctx?.drawImage(vid, 0, 0, canvas.width, canvas.height);
              thumbs.push(canvas.toDataURL('image/jpeg', 0.7));
            } catch(e) {
              thumbs.push('');
            }
            resolve();
          };
          vid.addEventListener('seeked', seekedHandler);
        });
      }

      setThumbnails(thumbs);
      setLoading(false);
    };

    generateThumbnails();
  }, [videoElement, visible]);

  if (!visible || loading || thumbnails.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 mb-2 flex gap-1 bg-black/90 p-2 rounded-lg overflow-x-auto z-50 max-w-full">
      {thumbnails.map((thumb, idx) => (
        <div
          key={idx}
          className="flex flex-col items-center cursor-pointer hover:scale-105 transition-transform"
          onClick={() => onSeek((duration / THUMBNAIL_COUNT) * idx)}
        >
          <img
            src={thumb}
            alt={`Preview at ${Math.round((duration / THUMBNAIL_COUNT) * idx)}s`}
            className="w-32 h-18 object-cover rounded border border-gold/50"
          />
          <span className="text-[10px] text-white mt-1">
            {Math.round((duration / THUMBNAIL_COUNT) * idx)}s
          </span>
        </div>
      ))}
    </div>
  );
}

// ------------------- المكون الرئيسي -------------------
export function MediaRenderer({ url, alt = "" }: { url?: string; alt?: string }) {
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(false);
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
          "play-large",
          "play",
          "progress",
          "current-time",
          "duration",
          "mute",
          "captions",
          "settings",
          "pip",
          "airplay",
          "fullscreen",
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
        storage: { enabled: true, key: 'plyr' },
      });
    };

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

  // دالة للقفز إلى وقت معين في الفيديو
  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setShowThumbnails(false);
    }
  };

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

  // Video with Plyr and Thumbnail Strip
  return (
    <div 
      className="relative w-full rounded-lg border border-gold/30 bg-black overflow-hidden"
      onMouseEnter={() => setShowThumbnails(true)}
      onMouseLeave={() => setShowThumbnails(false)}
    >
      <ThumbnailStrip
        videoElement={videoRef.current}
        onSeek={handleSeek}
        visible={showThumbnails}
      />
      <video
        ref={videoRef}
        className="plyr-react plyr w-full"
        playsInline
        crossOrigin="anonymous"
        preload="metadata"
      >
        <source src={videoSrc} type="video/mp4" />
        متصفحك لا يدعم تشغيل الفيديو.
      </video>
    </div>
  );
}
