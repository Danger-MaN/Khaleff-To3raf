"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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
  isVisible?: boolean;
}

const SEEK_INTERVAL_MS = 1250;
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
    const current = activeIndexRef.current;
    const next = current + 1;
    const newIndex = next >= total ? 0 : next;
    setActiveIndex(newIndex);
  }, []);

  useEffect(() => {
    if (loading || thumbnails.length === 0) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (isPlayingRef.current) {
        goToNextThumbnail();
      }
    }, SEEK_INTERVAL_MS);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [loading, thumbnails.length, goToNextThumbnail]);

  useEffect(() => {
    const video = videoElement;
    if (!video) return;
    const handlePlay = () => { if (isPlayingRef.current) setIsPlaying(false); };
    video.addEventListener('play', handlePlay);
    return () => video.removeEventListener('play', handlePlay);
  }, [videoElement]);

  useEffect(() => {
    if (durationRef.current > 0 && thumbnails.length > 0) {
      const step = durationRef.current / THUMBNAIL_COUNT;
      const time = step * activeIndex;
      onSeek(time);
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
      const time = step * i;
      vid.currentTime = time;
      await new Promise<void>((resolve) => {
        const seekedHandler = () => {
          vid.removeEventListener('seeked', seekedHandler);
          try {
            ctx?.drawImage(vid, 0, 0, canvas.width, canvas.height);
            thumbs.push(canvas.toDataURL('image/jpeg', 0.6));
          } catch (e) {
            thumbs.push('');
          }
          resolve();
        };
        vid.addEventListener('seeked', seekedHandler);
      });
    }
    setThumbnails(thumbs);
    setLoading(false);
  }, [videoElement]);

  const restartTimer = useCallback(() => {
    setActiveIndex(0);
    setIsPlaying(true);
  }, []);

  const handleThumbnailClick = useCallback((index: number, time: number) => {
    setIsPlaying(false);
    setActiveIndex(index);
    onSeek(time);
  }, [onSeek]);

  useEffect(() => {
    if (!videoElement) return;
    setIsPlaying(true);
    setActiveIndex(0);
    if (videoElement.readyState >= 2) {
      generateThumbnails();
    } else {
      videoElement.addEventListener('loadedmetadata', generateThumbnails, { once: true });
    }
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
            {isPlaying ? `🔄 تسليط ضوء تلقائي (كل ${SEEK_INTERVAL_MS/1000} ثانية)` : '⏸️ توقف مؤقت (شغّل الفيديو للإيقاف الدائم)'}
          </span>
          <span className="text-[11px] text-gold/80">
            {activeIndex + 1} / {THUMBNAIL_COUNT}
          </span>
        </div>
        {!isPlaying && (
          <button onClick={restartTimer} className="text-[11px] text-gold/80 hover:text-gold transition-colors">
            ▶ إعادة التشغيل
          </button>
        )}
      </div>
      <div className="flex gap-2 overflow-x-auto scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gold/50 pb-2">
        {thumbnails.map((thumb, idx) => {
          const step = duration / THUMBNAIL_COUNT;
          const time = step * idx;
          const percentage = Math.round((time / duration) * 100);
          const isActive = activeIndex === idx;
          return (
            <button key={idx} onClick={() => handleThumbnailClick(idx, time)} className={`flex flex-col items-center gap-1 transition-all hover:scale-105 focus:outline-none group flex-shrink-0 ${isActive ? 'scale-105' : ''}`} title={`انتقل إلى ${formatTime(time)} (${percentage}%)`}>
              <div className="relative">
                <img src={thumb} alt={`مشهد ${idx + 1}`} className={`w-28 h-16 object-cover rounded-lg border transition-all ${isActive ? 'border-gold ring-2 ring-gold/50 shadow-lg shadow-gold/20' : 'border-gold/30 group-hover:border-gold'}`} loading="lazy" />
                <div className="absolute bottom-1 right-1 bg-black/70 text-[10px] px-1 rounded text-gold">{percentage}%</div>
                {isActive && <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-gold text-black text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap">الحالي</div>}
              </div>
              <span className={`text-[10px] transition-colors ${isActive ? 'text-gold font-medium' : 'text-white/70 group-hover:text-gold'}`}>{formatTime(time)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ------------------- المكون الرئيسي -------------------
export function MediaRenderer({ url, alt = "" }: { url?: string; alt?: string }) {
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<Plyr | null>(null);

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

  useEffect(() => {
    if (!videoRef.current || !videoSrc || videoSrc.includes('youtube')) return;
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

    if (videoRef.current.readyState >= 1) {
      initializePlayer();
    } else {
      videoRef.current.addEventListener('loadedmetadata', initializePlayer, { once: true });
    }

    return () => {
      playerRef.current?.destroy();
      playerRef.current = null;
      setPlayerReady(false);
    };
  }, [videoSrc]);

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      if (videoRef.current.paused) {
        videoRef.current.play().catch(e => console.log('Play prevented:', e));
      }
    }
  };

  if (loading) return <div className="p-8 text-center text-gold">جاري تجهيز الفيديو...</div>;
  if (error || !videoSrc) return <div className="p-8 text-center text-red-400">لا يمكن عرض الفيديو. <a href={url} target="_blank" rel="noopener noreferrer" className="underline">فتح الرابط ↗</a></div>;
  if (videoSrc.includes("youtube.com/embed")) return <div style={{ aspectRatio: "16/9" }} className="relative w-full rounded-lg border border-gold/20 overflow-hidden"><iframe src={videoSrc} className="absolute inset-0 w-full h-full" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" /></div>;
  if (/\.(jpg|jpeg|png|gif|webp|avif)/i.test(videoSrc)) return <img src={videoSrc} alt={alt} className="w-full rounded-lg border border-gold/20" />;

  return (
    <div className="w-full rounded-lg border border-gold/20 bg-black overflow-hidden">
      <div className="p-0">
        <video
          ref={videoRef}
          className="plyr-react plyr w-full rounded-lg"
          playsInline
          crossOrigin="anonymous"
          preload="metadata"
        >
          <source src={videoSrc} type="video/mp4" />
          متصفحك لا يدعم تشغيل الفيديو.
        </video>
        {playerReady && (
          <ThumbnailStrip
            videoElement={videoRef.current}
            onSeek={handleSeek}
            isVisible={true}
          />
        )}
      </div>
    </div>
  );
}
