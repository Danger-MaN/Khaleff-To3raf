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

// ------------------- مكون عرض اللقطات (المتحرك التلقائي الدائري) -------------------
interface ThumbnailStripProps {
  videoElement: HTMLVideoElement | null;
  onSeek: (time: number) => void;
  isVisible?: boolean;
}

function ThumbnailStrip({ videoElement, onSeek, isVisible = true }: ThumbnailStripProps) {
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const userInteractedRef = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const THUMBNAIL_COUNT = 10;

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
  }, [videoElement]);

  // بدء الحركة التلقائية الدائرية (لا تتوقف أبداً)
  const startAutoScroll = useCallback(() => {
    if (!containerRef.current) return;
    
    const scroll = () => {
      if (!containerRef.current) return;
      
      // سرعة التمرير (بكسل لكل إطار)
      const scrollSpeed = 1.5;
      containerRef.current.scrollLeft += scrollSpeed;
      
      // عندما نصل إلى النهاية، نعيد التمرير إلى البداية فوراً (حلقة لا نهائية)
      const maxScroll = containerRef.current.scrollWidth - containerRef.current.clientWidth;
      if (containerRef.current.scrollLeft >= maxScroll) {
        containerRef.current.scrollLeft = 0;
      }
      
      // استمرار الحركة دائماً (لا تتوقف)
      animationRef.current = requestAnimationFrame(scroll);
    };
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    animationRef.current = requestAnimationFrame(scroll);
  }, []);

  // إيقاف الحركة التلقائية
  const stopAutoScroll = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  // التعامل مع تفاعل المستخدم (إيقاف الحركة نهائياً حتى يتفاعل مع الفيديو)
  const handleUserInteraction = useCallback(() => {
    if (!userInteractedRef.current && isAutoScrolling) {
      userInteractedRef.current = true;
      setIsAutoScrolling(false);
      stopAutoScroll();
    }
  }, [isAutoScrolling, stopAutoScroll]);

  // مراقبة أحداث تفاعل المستخدم مع شريط المشاهد
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const events = ['wheel', 'touchstart', 'mousedown'];
    events.forEach(event => {
      container.addEventListener(event, handleUserInteraction);
    });
    
    return () => {
      events.forEach(event => {
        container.removeEventListener(event, handleUserInteraction);
      });
    };
  }, [handleUserInteraction]);

  // بدء الحركة عند تحميل اللقطات (تستمر للأبد حتى يتفاعل المستخدم)
  useEffect(() => {
    if (!loading && thumbnails.length > 0 && isAutoScrolling) {
      startAutoScroll();
    }
    
    return () => stopAutoScroll();
  }, [loading, thumbnails, isAutoScrolling, startAutoScroll, stopAutoScroll]);

  // إعادة التوليد عند تغيير الفيديو
  useEffect(() => {
    if (!videoElement) return;
    
    // إعادة تعيين حالة التفاعل عند تغيير الفيديو
    userInteractedRef.current = false;
    setIsAutoScrolling(true);
    
    if (videoElement.readyState >= 2) {
      generateThumbnails();
    } else {
      videoElement.addEventListener('loadedmetadata', generateThumbnails, { once: true });
    }
  }, [videoElement, generateThumbnails]);

  if (!isVisible) return null;
  
  if (loading) {
    return (
      <div className="flex justify-center items-center gap-2 mt-3 p-2 bg-black/50 rounded-lg">
        <div className="animate-spin rounded-full h-5 w-5 border-2 border-gold border-t-transparent"></div>
        <span className="text-xs text-gold/70">جاري تحضير المشاهد...</span>
      </div>
    );
  }

  if (thumbnails.length === 0) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // تكرار اللقطات 5 مرات لإنشاء تأثير دائري سلس جداً
  const infiniteThumbnails = [...thumbnails, ...thumbnails, ...thumbnails, ...thumbnails, ...thumbnails];

  return (
    <div className="mt-3 w-full">
      {/* شريط الحالة */}
      <div className="flex justify-between items-center mb-1 px-1">
        <span className="text-[10px] text-white/50">
          {isAutoScrolling ? '🔄 تمرير تلقائي دائري (لا يتوقف)' : '⏸️ توقف - انتظر تفاعلك مع الفيديو'}
        </span>
        {!isAutoScrolling && (
          <button
            onClick={() => {
              userInteractedRef.current = false;
              setIsAutoScrolling(true);
              startAutoScroll();
            }}
            className="text-[10px] text-gold/70 hover:text-gold transition-colors"
          >
            إعادة تشغيل التمرير التلقائي
          </button>
        )}
      </div>
      
      {/* شريط المشاهد المتحرك الدائري */}
      <div
        ref={containerRef}
        className="flex gap-2 overflow-x-auto scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gold/50 pb-2 cursor-grab active:cursor-grabbing"
        style={{ scrollBehavior: 'auto' }}
      >
        {infiniteThumbnails.map((thumb, idx) => {
          const originalIdx = idx % thumbnails.length;
          const time = (duration / thumbnails.length) * originalIdx;
          const percentage = Math.round((time / duration) * 100);
          return (
            <button
              key={`${originalIdx}-${idx}`}
              onClick={() => {
                // عند النقر على مشهد، ننقل الفيديو ونتوقف عن التمرير التلقائي نهائياً
                if (isAutoScrolling) {
                  userInteractedRef.current = true;
                  setIsAutoScrolling(false);
                  stopAutoScroll();
                }
                onSeek(time);
              }}
              className="flex flex-col items-center gap-1 transition-all hover:scale-105 focus:outline-none group flex-shrink-0"
              title={`انتقل إلى ${formatTime(time)} (${percentage}%)`}
            >
              <div className="relative">
                <img
                  src={thumb}
                  alt={`مشهد ${originalIdx + 1}`}
                  className="w-28 h-16 object-cover rounded-lg border border-gold/30 group-hover:border-gold transition-colors"
                  loading="lazy"
                />
                <div className="absolute bottom-1 right-1 bg-black/70 text-[10px] px-1 rounded text-gold">
                  {percentage}%
                </div>
              </div>
              <span className="text-[10px] text-white/70 group-hover:text-gold">
                {formatTime(time)}
              </span>
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
  const userInteractedRef = useRef(false);

  // Reset and fetch when url changes
  useEffect(() => {
    setVideoSrc(null);
    setError(false);
    setPlayerReady(false);
    userInteractedRef.current = false;
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

  // Initialize Plyr when video source is ready
  useEffect(() => {
    if (!videoRef.current || !videoSrc || videoSrc.includes('youtube')) return;
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

  // دالة للقفز إلى وقت معين في الفيديو
  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      if (videoRef.current.paused) {
        videoRef.current.play().catch(e => console.log('Play prevented:', e));
      }
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

  // Video with Plyr and Auto-scrolling Thumbnail Strip
  return (
    <div className="w-full rounded-lg border border-gold/30 bg-black overflow-hidden">
      <div className="p-2">
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
        
        {/* شريط المشاهد المتحرك الدائري */}
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
