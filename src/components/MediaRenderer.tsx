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

// ------------------- مكونات iframe منفصلة (للتشغيل الكامل) -------------------

function YouTubeIframe({ videoId, videoAspect, isPreview = false }: { videoId: string; videoAspect: VideoAspect; isPreview?: boolean }) {
  if (isPreview) {
    // في وضع المعاينة: نعرض صورة مصغرة من YouTube
    return (
      <div className="relative w-full rounded-lg overflow-hidden bg-black" style={{ aspectRatio: videoAspect === "landscape" ? '16/9' : videoAspect === "portrait" ? '9/16' : '16/9' }}>
        <img
          src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
          alt="Video thumbnail"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="w-12 h-12 rounded-full bg-gold/80 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
          </div>
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
    // في وضع المعاينة: نعرض صورة مصغرة (يمكن استخدام خدمة خارجية، لكن سنعرض أيقونة)
    return (
      <div className="relative w-full rounded-lg overflow-hidden bg-black" style={{ aspectRatio: videoAspect === "landscape" ? '16/9' : videoAspect === "portrait" ? '9/16' : '16/9' }}>
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="w-12 h-12 rounded-full bg-gold/80 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>
        <div className="text-white text-xs absolute bottom-2 left-2 bg-black/50 px-2 rounded">Facebook Video</div>
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

function GoogleDriveIframe({ embedUrl, videoAspect, isPreview = false }: { embedUrl: string; videoAspect: VideoAspect; isPreview?: boolean }) {
  if (isPreview) {
    return (
      <div className="relative w-full rounded-lg overflow-hidden bg-black" style={{ aspectRatio: videoAspect === "landscape" ? '16/9' : videoAspect === "portrait" ? '9/16' : '16/9' }}>
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="w-12 h-12 rounded-full bg-gold/80 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>
        <div className="text-white text-xs absolute bottom-2 left-2 bg-black/50 px-2 rounded">Google Drive</div>
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
  isPreview?: boolean; // جديد: وضع المعاينة (في القوائم والبطاقات)
}

export function MediaRenderer({ url, alt = "", videoAspect = "auto", isPreview = false }: MediaRendererProps) {
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

  // عرض حسب النوع مع دعم isPreview
  switch (type) {
    case "youtube":
      return <YouTubeIframe videoId={src} videoAspect={videoAspect} isPreview={isPreview} />;
    case "facebook":
      return <FacebookIframe embedUrl={src} videoAspect={videoAspect} isPreview={isPreview} />;
    case "googledrive":
      return <GoogleDriveIframe embedUrl={src} videoAspect={videoAspect} isPreview={isPreview} />;
    case "streamtape":
    case "video": {
      if (isPreview) {
        // في وضع المعاينة: نعرض أول إطار من الفيديو (ممكن استخدام خدمة خارجية) أو أيقونة
        return (
          <div className="relative w-full rounded-lg overflow-hidden bg-black" style={{ aspectRatio: videoAspect === "landscape" ? '16/9' : videoAspect === "portrait" ? '9/16' : '16/9' }}>
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="w-12 h-12 rounded-full bg-gold/80 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
              </div>
            </div>
          </div>
        );
      }
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
      return <img src={src} alt={alt} className="w-full rounded-lg border border-gold/20" style={{ objectFit: 'cover' }} />;
    default:
      return null;
  }
}
