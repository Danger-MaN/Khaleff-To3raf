"use client";

import { useEffect, useState, useRef, useCallback } from "react";
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

function isFacebookVideoUrl(url: string): boolean {
  return /(facebook\.com.*\/videos\/|fb\.watch\/|facebook\.com\/watch\/\?v=)/i.test(url);
}

// ------------------- دوال Twitter (X) -------------------
function isTwitterVideoUrl(url: string): boolean {
  return /(twitter\.com|x\.com)\/(?:#!\/)?(\w+)\/status(?:es)?\/(\d+)/i.test(url);
}

async function getTwitterEmbedUrl(url: string): Promise<string | null> {
  try {
    const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&theme=dark&hide_thread=1`;
    const response = await fetch(oembedUrl);
    const data = await response.json();
    if (data.html) {
      const srcMatch = data.html.match(/src="([^"]+)"/);
      if (srcMatch) return srcMatch[1];
    }
    // Fallback: extract tweet id
    const match = url.match(/(?:twitter\.com|x\.com)\/(?:#!\/)?(\w+)\/status(?:es)?\/(\d+)/i);
    if (match) {
      const tweetId = match[2];
      return `https://platform.twitter.com/widgets/tweet.html?dnt=true&id=${tweetId}&theme=dark`;
    }
    return null;
  } catch (error) {
    console.error("Twitter embed error:", error);
    return null;
  }
}

// ------------------- دوال TikTok -------------------
function isTikTokUrl(url: string): boolean {
  return /(tiktok\.com\/@[\w.-]+\/video\/\d+|tiktok\.com\/t\/[\w]+)/i.test(url);
}

async function getTikTokEmbedUrl(url: string): Promise<string | null> {
  try {
    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
    const response = await fetch(oembedUrl);
    const data = await response.json();
    if (data.html) {
      const srcMatch = data.html.match(/src="([^"]+)"/);
      if (srcMatch) return srcMatch[1];
    }
    return null;
  } catch (error) {
    console.error("TikTok embed error:", error);
    return null;
  }
}

// ------------------- دوال Instagram -------------------
function isInstagramUrl(url: string): boolean {
  return /(instagram\.com\/p\/|instagram\.com\/reel\/)/i.test(url);
}

async function getInstagramEmbedUrl(url: string): Promise<string | null> {
  try {
    const oembedUrl = `https://graph.facebook.com/v17.0/instagram_oembed?url=${encodeURIComponent(url)}&access_token=IGQVJY...`;
    // Fallback to public oEmbed endpoint (may have rate limits)
    const fallbackUrl = `https://api.instagram.com/oembed?url=${encodeURIComponent(url)}`;
    const response = await fetch(fallbackUrl);
    const data = await response.json();
    if (data.html) {
      const srcMatch = data.html.match(/src="([^"]+)"/);
      if (srcMatch) return srcMatch[1];
    }
    return null;
  } catch (error) {
    console.error("Instagram embed error:", error);
    return null;
  }
}

function getFacebookEmbedUrl(url: string): string | null {
  try {
    const videoMatch = url.match(/facebook\.com\/(?:[^\/]+\/)?videos\/(?:[^\/]+\/)?(\d+)/i);
    if (videoMatch && videoMatch[1]) {
      const videoId = videoMatch[1];
      const pageMatch = url.match(/facebook\.com\/([^\/?]+)/i);
      const pageId = pageMatch && pageMatch[1] !== 'videos' && pageMatch[1] !== 'watch' ? pageMatch[1] : 'facebook';
      return `https://www.facebook.com/plugins/video.php?href=https://www.facebook.com/${pageId}/videos/${videoId}/`;
    }
    const watchMatch = url.match(/facebook\.com\/watch\/\?v=(\d+)/i);
    if (watchMatch && watchMatch[1]) {
      return `https://www.facebook.com/plugins/video.php?href=https://www.facebook.com/facebook/videos/${watchMatch[1]}/`;
    }
    const fbWatchMatch = url.match(/fb\.watch\/([a-zA-Z0-9]+)/i);
    if (fbWatchMatch) {
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}`;
    }
    return null;
  } catch (error) {
    console.error("Facebook embed error:", error);
    return null;
  }
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

// ------------------- مكون عرض اللقطات (ThumbnailStrip) -------------------
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

// ------------------- مكونات iframe منفصلة للمنصات -------------------

function YouTubeIframe({ videoId, videoAspect, isPreview = false }: { videoId: string; videoAspect: VideoAspect; isPreview?: boolean }) {
  if (isPreview) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-gold/80 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
        </div>
      </div>
    );
  }

  let containerStyle: React.CSSProperties = {};
  if (videoAspect === "landscape") containerStyle = { aspectRatio: '16/9' };
  else if (videoAspect === "portrait") containerStyle = { aspectRatio: '9/16', maxHeight: '80vh', margin: '0 auto' };
  else containerStyle = { width: '100%', height: 'auto', minHeight: '300px' };

  return (
    <div className="w-full rounded-lg border border-gold/20 bg-black overflow-hidden">
      <div style={containerStyle}>
        <iframe
          src={`https://www.youtube.com/embed/${videoId}`}
          className="w-full h-full border-0"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
      </div>
    </div>
  );
}

function FacebookIframe({ embedUrl, videoAspect, isPreview = false }: { embedUrl: string; videoAspect: VideoAspect; isPreview?: boolean }) {
  if (isPreview) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-gold/80 flex items-center justify-center pointer-events-none">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
        </div>
      </div>
    );
  }

  let containerStyle: React.CSSProperties = {};
  let iframeStyle: React.CSSProperties = { width: '100%', height: '100%', border: 0 };

  if (videoAspect === "landscape") {
    containerStyle = { aspectRatio: '16/9' };
  } else if (videoAspect === "portrait") {
    containerStyle = { aspectRatio: '9/16', maxHeight: '100vh', margin: '0 auto', position: 'relative' };
    iframeStyle = { position: 'absolute', top: '25%', left: 0, width: '100%', height: '95%', border: 0 };
  } else {
    containerStyle = { width: '100%', height: 'auto', minHeight: '300px' };
  }

  return (
    <div className="w-full rounded-lg border border-gold/20 bg-black overflow-hidden">
      <div style={containerStyle}>
        <iframe
          src={embedUrl}
          style={iframeStyle}
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
      </div>
    </div>
  );
}

// ------------------- مكون Twitter iframe -------------------
function TwitterIframe({ embedUrl, videoAspect, isPreview = false }: { embedUrl: string; videoAspect: VideoAspect; isPreview?: boolean }) {
  if (isPreview) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-gold/80 flex items-center justify-center pointer-events-none">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
        </div>
      </div>
    );
  }

  let containerStyle: React.CSSProperties = {};
  if (videoAspect === "landscape") containerStyle = { aspectRatio: '16/9' };
  else if (videoAspect === "portrait") containerStyle = { aspectRatio: '9/16', maxHeight: '80vh', margin: '0 auto' };
  else containerStyle = { width: '100%', height: 'auto', minHeight: '300px' };

  return (
    <div className="w-full rounded-lg border border-gold/20 bg-black overflow-hidden">
      <div style={containerStyle}>
        <iframe
          src={embedUrl}
          className="w-full h-full border-0"
          allowFullScreen
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
        />
      </div>
    </div>
  );
}

// ------------------- مكون TikTok iframe -------------------
function TikTokIframe({ embedUrl, videoAspect, isPreview = false }: { embedUrl: string; videoAspect: VideoAspect; isPreview?: boolean }) {
  if (isPreview) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-gold/80 flex items-center justify-center pointer-events-none">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white">
            <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.76-.08 1.4-.54 2.79-1.35 3.99-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
          </svg>
        </div>
      </div>
    );
  }

  let containerStyle: React.CSSProperties = {};
  if (videoAspect === "landscape") containerStyle = { aspectRatio: '16/9' };
  else if (videoAspect === "portrait") containerStyle = { aspectRatio: '9/16', maxHeight: '80vh', margin: '0 auto' };
  else containerStyle = { width: '100%', height: 'auto', minHeight: '300px' };

  return (
    <div className="w-full rounded-lg border border-gold/20 bg-black overflow-hidden">
      <div style={containerStyle}>
        <iframe
          src={embedUrl}
          className="w-full h-full border-0"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
        />
      </div>
    </div>
  );
}

// ------------------- مكون Instagram iframe -------------------
function InstagramIframe({ embedUrl, videoAspect, isPreview = false }: { embedUrl: string; videoAspect: VideoAspect; isPreview?: boolean }) {
  if (isPreview) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-gold/80 flex items-center justify-center pointer-events-none">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white">
            <path d="M12 2c2.7 0 3.1.01 4.2.06 1.2.06 2 .26 2.7.55.8.31 1.4.72 2 1.3.6.6 1 1.2 1.3 2 .3.7.5 1.5.6 2.7.1 1.1.1 1.5.1 4.2s-.01 3.1-.06 4.2c-.06 1.2-.26 2-.55 2.7-.31.8-.72 1.4-1.3 2-.6.6-1.2 1-2 1.3-.7.3-1.5.5-2.7.6-1.1.1-1.5.1-4.2.1s-3.1-.01-4.2-.06c-1.2-.06-2-.26-2.7-.55-.8-.31-1.4-.72-2-1.3-.6-.6-1-1.2-1.3-2-.3-.7-.5-1.5-.6-2.7-.1-1.1-.1-1.5-.1-4.2s.01-3.1.06-4.2c.06-1.2.26-2 .55-2.7.31-.8.72-1.4 1.3-2 .6-.6 1.2-1 2-1.3.7-.3 1.5-.5 2.7-.6 1.1-.1 1.5-.1 4.2-.1z"/>
          </svg>
        </div>
      </div>
    );
  }

  let containerStyle: React.CSSProperties = {};
  if (videoAspect === "landscape") containerStyle = { aspectRatio: '16/9' };
  else if (videoAspect === "portrait") containerStyle = { aspectRatio: '9/16', maxHeight: '80vh', margin: '0 auto' };
  else containerStyle = { width: '100%', height: 'auto', minHeight: '300px' };

  return (
    <div className="w-full rounded-lg border border-gold/20 bg-black overflow-hidden">
      <div style={containerStyle}>
        <iframe
          src={embedUrl}
          className="w-full h-full border-0"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
        />
      </div>
    </div>
  );
}

function GoogleDriveIframe({ embedUrl, videoAspect, isPreview = false }: { embedUrl: string; videoAspect: VideoAspect; isPreview?: boolean }) {
  if (isPreview) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-gold/80 flex items-center justify-center pointer-events-none">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
        </div>
      </div>
    );
  }

  let containerStyle: React.CSSProperties = {};
  if (videoAspect === "landscape") containerStyle = { aspectRatio: '16/9' };
  else if (videoAspect === "portrait") containerStyle = { aspectRatio: '9/16', maxHeight: '80vh', margin: '0 auto' };
  else containerStyle = { width: '100%', height: 'auto', minHeight: '300px' };

  return (
    <div className="w-full rounded-lg border border-gold/20 bg-black overflow-hidden">
      <div style={containerStyle}>
        <iframe
          src={embedUrl}
          className="w-full h-full border-0"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
        />
      </div>
    </div>
  );
}

// ------------------- مكون الفيديو المباشر مع Plyr و ThumbnailStrip -------------------
interface DirectVideoPlayerProps {
  src: string;
  videoAspect: VideoAspect;
}

function DirectVideoPlayer({ src, videoAspect }: DirectVideoPlayerProps) {
  const [playerReady, setPlayerReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<Plyr | null>(null);

  useEffect(() => {
    if (!videoRef.current) return;
    if (playerRef.current) playerRef.current.destroy();

    const initializePlayer = () => {
      if (!videoRef.current) return;
      const isPortrait = videoAspect === "portrait";
      const controlsList = isPortrait
        ? ["play-large", "play", "progress", "current-time", "duration", "mute", "fullscreen"]
        : ["play-large", "play", "progress", "current-time", "duration", "mute", "captions", "settings", "pip", "airplay", "fullscreen"]; // تم إزالة "volume"

      playerRef.current = new Plyr(videoRef.current, {
        controls: controlsList,
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
  }, [src, videoAspect]);

  const handleSeek = (time: number) => {
    if (videoRef.current) videoRef.current.currentTime = time;
  };

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
          ref={videoRef}
          style={videoStyle}
          playsInline
          crossOrigin="anonymous"
          preload="metadata"
        >
          <source src={src} type="video/mp4" />
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
      <style jsx>{`
        .portrait-mode :global(.plyr__controls) {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 6px;
          padding: 6px;
        }
        @media (max-width: 480px) {
          .portrait-mode :global(.plyr__controls) {
            overflow-x: auto;
            flex-wrap: nowrap;
            justify-content: flex-start;
          }
        }
        :global(.plyr__controls) {
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
        }
      `}</style>
    </div>
  );
}

// ------------------- المكون الرئيسي -------------------
interface MediaRendererProps {
  url?: string;
  alt?: string;
  videoAspect?: VideoAspect;
  isPreview?: boolean;
}

export function MediaRenderer({ url, alt = "", videoAspect = "auto", isPreview = false }: MediaRendererProps) {
  const [type, setType] = useState<"youtube" | "facebook" | "twitter" | "tiktok" | "instagram" | "googledrive" | "streamtape" | "video" | "image" | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    const process = async () => {
      setSrc(null);
      setType(null);
      setError(false);
      if (!url) return;

      const yt = getYouTubeId(url);
      if (yt) {
        setType("youtube");
        setSrc(yt);
        return;
      }

      if (isFacebookVideoUrl(url)) {
        const embed = getFacebookEmbedUrl(url);
        if (embed) {
          setType("facebook");
          setSrc(embed);
          return;
        }
      }

      if (isTwitterVideoUrl(url)) {
        const embedUrl = await getTwitterEmbedUrl(url);
        if (embedUrl) {
          setType("twitter");
          setSrc(embedUrl);
          return;
        }
      }

      if (isTikTokUrl(url)) {
        const embedUrl = await getTikTokEmbedUrl(url);
        if (embedUrl) {
          setType("tiktok");
          setSrc(embedUrl);
          return;
        }
      }

      if (isInstagramUrl(url)) {
        const embedUrl = await getInstagramEmbedUrl(url);
        if (embedUrl) {
          setType("instagram");
          setSrc(embedUrl);
          return;
        }
      }

      if (isGoogleDriveUrl(url)) {
        const embed = getGoogleDriveEmbedUrl(url);
        if (embed) {
          setType("googledrive");
          setSrc(embed);
          return;
        }
        setError(true);
        return;
      }

      if (isStreamTapeUrl(url)) {
        setLoading(true);
        const proxy = await getStreamTapeProxiedUrl(url);
        if (proxy && mounted) {
          setType("streamtape");
          setSrc(proxy);
        } else if (mounted) setError(true);
        setLoading(false);
        return;
      }

      if (isTeraboxUrl(url)) {
        setError(true);
        return;
      }

      if (/\.(mp4|webm|mov|ogg)$/i.test(url)) {
        setType("video");
        setSrc(url);
        return;
      }

      if (/\.(jpg|jpeg|png|gif|webp|avif)$/i.test(url)) {
        setType("image");
        setSrc(url);
        return;
      }

      setError(true);
    };
    process();
    return () => { mounted = false; };
  }, [url]);

  if (loading) return <div className="p-8 text-center text-gold">جاري التحميل...</div>;
  if (error || !src || !type) return <div className="p-8 text-center text-red-400">لا يمكن عرض المحتوى. <a href={url} target="_blank" rel="noopener noreferrer">فتح الرابط ↗</a></div>;

  // ===================== وضع المعاينة (isPreview = true) =====================
  if (isPreview) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-gold/80 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </div>
      </div>
    );
  }

  // ===================== وضع التشغيل الكامل (isPreview = false) =====================
  switch (type) {
    case "youtube":
      return <YouTubeIframe videoId={src} videoAspect={videoAspect} isPreview={false} />;
    case "facebook":
      return <FacebookIframe embedUrl={src} videoAspect={videoAspect} isPreview={false} />;
    case "twitter":
      return <TwitterIframe embedUrl={src} videoAspect={videoAspect} isPreview={false} />;
    case "tiktok":
      return <TikTokIframe embedUrl={src} videoAspect={videoAspect} isPreview={false} />;
    case "instagram":
      return <InstagramIframe embedUrl={src} videoAspect={videoAspect} isPreview={false} />;
    case "googledrive":
      return <GoogleDriveIframe embedUrl={src} videoAspect={videoAspect} isPreview={false} />;
    case "streamtape":
    case "video":
      return <DirectVideoPlayer src={src} videoAspect={videoAspect} />;
    case "image":
      return <img src={src} alt={alt} className="w-full rounded-lg border border-gold/20" />;
    default:
      return null;
  }
}
