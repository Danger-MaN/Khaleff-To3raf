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

function isFacebookVideoUrl(url: string): boolean {
  return /(facebook\.com.*\/videos\/|fb\.watch\/|facebook\.com\/watch\/\?v=)/i.test(url);
}

function getFacebookEmbedUrl(url: string): string | null {
  try {
    // نمط: facebook.com/PAGE_ID/videos/VIDEO_ID
    const videoMatch = url.match(/facebook\.com\/(?:[^\/]+\/)?videos\/(?:[^\/]+\/)?(\d+)/i);
    if (videoMatch && videoMatch[1]) {
      const videoId = videoMatch[1];
      const pageMatch = url.match(/facebook\.com\/([^\/?]+)/i);
      const pageId = pageMatch && pageMatch[1] !== 'videos' && pageMatch[1] !== 'watch' ? pageMatch[1] : 'facebook';
      return `https://www.facebook.com/plugins/video.php?href=https://www.facebook.com/${pageId}/videos/${videoId}/`;
    }
    // نمط: facebook.com/watch/?v=VIDEO_ID
    const watchMatch = url.match(/facebook\.com\/watch\/\?v=(\d+)/i);
    if (watchMatch && watchMatch[1]) {
      return `https://www.facebook.com/plugins/video.php?href=https://www.facebook.com/facebook/videos/${watchMatch[1]}/`;
    }
    // نمط مختصر: fb.watch/...
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

// ------------------- مكونات iframe منفصلة لكل منصة -------------------

// 1. YouTube iframe
function YouTubeIframe({ videoId, videoAspect }: { videoId: string; videoAspect: VideoAspect }) {
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

// 2. Facebook iframe (مع تحسين الوضع الطولي)
function FacebookIframe({ embedUrl, videoAspect }: { embedUrl: string; videoAspect: VideoAspect }) {
  let containerStyle: React.CSSProperties = {};
  let iframeStyle: React.CSSProperties = { width: '100%', height: '100%', border: 0 };

  if (videoAspect === "landscape") {
    containerStyle = { aspectRatio: '16/9' };
  } else if (videoAspect === "portrait") {
    // وضع ريلز: حاوية بنسبة 9:16، والفيديو يملأها بالكامل
    containerStyle = { aspectRatio: '9/16', maxHeight: '100vh', margin: '0 auto' };
    iframeStyle = { width: '100%', height: '50%', border: 0 };
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

// 3. Google Drive iframe
function GoogleDriveIframe({ embedUrl, videoAspect }: { embedUrl: string; videoAspect: VideoAspect }) {
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
        />
      </div>
    </div>
  );
}

// ------------------- المكون الرئيسي -------------------
interface MediaRendererProps {
  url?: string;
  alt?: string;
  videoAspect?: VideoAspect;
}

export function MediaRenderer({ url, alt = "", videoAspect = "auto" }: MediaRendererProps) {
  const [type, setType] = useState<"youtube" | "facebook" | "googledrive" | "streamtape" | "video" | "image" | null>(null);
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

      // YouTube
      const yt = getYouTubeId(url);
      if (yt) {
        setType("youtube");
        setSrc(yt);
        return;
      }

      // Facebook
      if (isFacebookVideoUrl(url)) {
        const embed = getFacebookEmbedUrl(url);
        if (embed) {
          setType("facebook");
          setSrc(embed);
          return;
        }
        // إذا فشل، لا نعرض خطأ فوراً بل ننتقل للخيار التالي
      }

      // Google Drive
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

      // StreamTape
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

      // Terabox (غير مدعوم)
      if (isTeraboxUrl(url)) {
        setError(true);
        return;
      }

      // روابط مباشرة
      if (/\.(mp4|webm|mov|ogg)$/i.test(url)) {
        setType("video");
        setSrc(url);
        return;
      }

      // صور
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

  // عرض حسب النوع
  switch (type) {
    case "youtube":
      return <YouTubeIframe videoId={src} videoAspect={videoAspect} />;
    case "facebook":
      return <FacebookIframe embedUrl={src} videoAspect={videoAspect} />;
    case "googledrive":
      return <GoogleDriveIframe embedUrl={src} videoAspect={videoAspect} />;
    case "streamtape":
    case "video": {
      let videoStyle: React.CSSProperties = { width: '100%', height: 'auto' };
      if (videoAspect === "portrait") {
        videoStyle = { height: '80vh', width: 'auto', margin: '0 auto' };
      }
      return (
        <div className="w-full bg-black rounded-lg border border-gold/20 overflow-hidden">
          <video src={src} style={videoStyle} controls playsInline className="w-full h-auto">
            متصفحك لا يدعم الفيديو.
          </video>
        </div>
      );
    }
    case "image":
      return <img src={src} alt={alt} className="w-full rounded-lg border border-gold/20" />;
    default:
      return null;
  }
}
