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
  if (matchFile) fileId = matchFile[1];
  else {
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

// ------------------- مكون عرض اللقطات (لم يتغير) -------------------
interface ThumbnailStripProps {
  videoElement: HTMLVideoElement | null;
  onSeek: (time: number) => void;
  isVisible?: boolean;
}

const SEEK_INTERVAL_MS = 3000;
const THUMBNAIL_COUNT = 10;

function ThumbnailStrip({ videoElement, onSeek, isVisible = true }: ThumbnailStripProps) {
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPlayingRef = useRef(isPlaying);
  const activeIndexRef = useRef(activeIndex);
  const thumbnailsLengthRef = useRef(0);
  const durationRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));

  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { activeIndexRef.current = activeIndex; }, [activeIndex]);
  useEffect(() => { thumbnailsLengthRef.current = thumbnails.length; }, [thumbnails]);
  useEffect(() => { durationRef.current = duration; }, [duration]);

  const goToNextThumbnail = useCallback(() => {
    const total = thumbnailsLengthRef.current;
    if (total === 0) return;
    setActiveIndex((activeIndexRef.current + 1) % total);
  }, []);

  useEffect(() => {
    if (loading || thumbnails.length === 0) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (isPlayingRef.current) goToNextThumbnail();
    }, SEEK_INTERVAL_MS);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [loading, thumbnails.length, goToNextThumbnail]);

  useEffect(() => {
    const video = videoElement;
    if (!video) return;
    const handlePlay = () => { if (isPlayingRef.current) setIsPlaying(false); };
    const handlePause = () => { if (isPlayingRef.current) setIsPlaying(false); };
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [videoElement]);

  useEffect(() => {
    if (durationRef.current > 0 && thumbnails.length > 0) {
      const step = durationRef.current / THUMBNAIL_COUNT;
      onSeek(step * activeIndex);
    }
  }, [activeIndex, thumbnails.length, onSeek]);

  const generateThumbnails = useCallback(async () => {
    if (!videoElement) return;
    setLoading(true);
    const vid = videoElement;
    const dur = vid.duration;
    if (!dur || isNaN(dur)) return;
    setDuration(dur);
    const thumbs: string[] = [];
    const step = dur / THUMBNAIL_COUNT;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = 120;
    canvas.height = 68;

    for (let i = 0; i < THUMBNAIL_COUNT; i++) {
      vid.currentTime = step * i;
      await new Promise<void>((resolve) => {
        const seekedHandler = () => {
          vid.removeEventListener('seeked', seekedHandler);
          try {
            ctx?.drawImage(vid, 0, 0, canvas.width, canvas.height);
            thumbs.push(canvas.toDataURL('image/jpeg', 0.6));
          } catch { thumbs.push(''); }
          resolve();
        };
        vid.addEventListener('seeked', seekedHandler);
      });
    }
    setThumbnails(thumbs);
    setLoading(false);
  }, [videoElement]);

  const restartTimer = useCallback(() => { setActiveIndex(0); setIsPlaying(true); }, []);
  const handleThumbnailClick = useCallback((index: number, time: number) => { setIsPlaying(false); setActiveIndex(index); onSeek(time); }, [onSeek]);

  useEffect(() => {
    if (!videoElement) return;
    setIsPlaying(true);
    setActiveIndex(0);
    if (videoElement.readyState >= 2) generateThumbnails();
    else videoElement.addEventListener('loadedmetadata', generateThumbnails, { once: true });
  }, [videoElement, generateThumbnails]);

  if (!isVisible) return null;
  if (loading) return <div className="flex justify-center items-center gap-2 mt-3 p-2 bg-black/50 rounded-lg"><div className="animate-spin rounded-full h-5 w-5 border-2 border-gold border-t-transparent"></div><span className="text-xs text-gold/70">جاري تحضير المشاهد...</span></div>;
  if (thumbnails.length === 0) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="mt-3 w-full">
      <div className="flex justify-between items-center mb-2 px-1">
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-white/60">
            {isPlaying ? `🔄 تسليط ضوء تلقائي (كل ${SEEK_INTERVAL_MS/1000} ثانية)` : '⏸️ توقف مؤقت'}
          </span>
          <span className="text-[11px] text-gold/80">{activeIndex + 1} / {THUMBNAIL_COUNT}</span>
        </div>
        {!isPlaying && <button onClick={restartTimer} className="text-[11px] text-gold/80 hover:text-gold">▶ إعادة التشغيل</button>}
      </div>
      <div className="flex gap-2 overflow-x-auto scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gold/50 pb-2">
        {thumbnails.map((thumb, idx) => {
          const time = (duration / THUMBNAIL_COUNT) * idx;
          const percentage = Math.round((time / duration) * 100);
          const isActive = activeIndex === idx;
          return (
            <button key={idx} onClick={() => handleThumbnailClick(idx, time)} className={`flex flex-col items-center gap-1 transition-all hover:scale-105 focus:outline-none group flex-shrink-0 ${isActive ? 'scale-105' : ''}`}>
              <div className="relative">
                <img src={thumb} alt={`مشهد ${idx+1}`} className={`w-28 h-16 object-cover rounded-lg border transition-all ${isActive ? 'border-gold ring-2 ring-gold/50 shadow-lg' : 'border-gold/30 group-hover:border-gold'}`} loading="lazy" />
                <div className="absolute bottom-1 right-1 bg-black/70 text-[10px] px-1 rounded text-gold">{percentage}%</div>
                {isActive && <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-gold text-black text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap">الحالي</div>}
              </div>
              <span className={`text-[10px] ${isActive ? 'text-gold font-medium' : 'text-white/70 group-hover:text-gold'}`}>{formatTime(time)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ------------------- المكون الرئيسي (بدون Plyr، مع <video controls>) -------------------
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
  const [videoDuration, setVideoDuration] = useState(0);

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

    if (isGoogleDriveUrl(url)) {
      const embedUrl = getGoogleDriveEmbedUrl(url);
      if (embedUrl) setVideoSrc(embedUrl);
      else setError(true);
      setPlayerReady(true);
      return;
    }

    if (isStreamTapeUrl(url)) {
      setLoading(true);
      getStreamTapeProxiedUrl(url)
        .then(src => (src ? setVideoSrc(src) : setError(true)))
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

  // جاهزية الفيديو للقطات
  useEffect(() => {
    if (!videoRef.current) return;
    const handleLoadedMetadata = () => {
      setVideoDuration(videoRef.current?.duration || 0);
      setPlayerReady(true);
    };
    videoRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
    return () => {
      if (videoRef.current) videoRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [videoSrc]);

  const handleSeek = (time: number) => {
    if (videoRef.current) videoRef.current.currentTime = time;
  };

  if (loading) return <div className="p-8 text-center text-gold">جاري تجهيز الفيديو...</div>;
  if (error || !videoSrc)
    return (
      <div className="p-8 text-center text-red-400">
        لا يمكن عرض المحتوى.{" "}
        <a href={url} target="_blank" rel="noopener noreferrer" className="underline">
          فتح الرابط ↗
        </a>
      </div>
    );

  // ---------- YouTube ----------
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

  // ---------- Google Drive (iframe) مع دعم الـ aspect ----------
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

  // ---------- الصور ----------
  if (/\.(jpg|jpeg|png|gif|webp|avif)/i.test(videoSrc)) {
    return <img src={videoSrc} alt={alt} className="w-full rounded-lg border border-gold/20" />;
  }

  // ---------- الفيديو المباشر (مع عنصر <video> الأصلي وبدون Plyr) ----------
  let videoContainerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    borderRadius: '0.5rem',
    overflow: 'hidden',
  };
  let videoStyle: React.CSSProperties = {
    maxWidth: '100%',
    maxHeight: '80vh',
    width: 'auto',
    height: 'auto',
    display: 'block',
  };

  if (videoAspect === "portrait") {
    videoStyle = { ...videoStyle, height: '80vh', width: 'auto' };
  } else if (videoAspect === "landscape") {
    videoStyle = { ...videoStyle, width: '100%', height: 'auto' };
  }

  return (
    <div className="w-full rounded-lg border border-gold/20 bg-black overflow-hidden">
      <div style={videoContainerStyle}>
        <video
          ref={videoRef}
          style={videoStyle}
          controls
          playsInline
          preload="metadata"
        >
          <source src={videoSrc} type="video/mp4" />
          متصفحك لا يدعم تشغيل الفيديو.
        </video>
      </div>
      {playerReady && videoDuration > 0 && (
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
