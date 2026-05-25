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

// ------------------- مكونات iframe منفصلة لكل منصة مع توسيط عمودي وأفقي -------------------

function YouTubeIframe({ videoId, videoAspect }: { videoId: string; videoAspect: VideoAspect }) {
  let containerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    backgroundColor: 'black',
  };
  let iframeStyle: React.CSSProperties = { border: 0 };

  if (videoAspect === "landscape") {
    containerStyle.aspectRatio = '16/9';
    iframeStyle.width = '100%';
    iframeStyle.height = '100%';
  } else if (videoAspect === "portrait") {
    containerStyle.aspectRatio = '9/16';
    containerStyle.maxHeight = '80vh';
    containerStyle.margin = '0 auto';
    iframeStyle.width = '100%';
    iframeStyle.height = '100%';
  } else {
    // auto
    containerStyle.minHeight = '300px';
    iframeStyle.width = '100%';
    iframeStyle.height = '100%';
  }

  return (
    <div className="w-full rounded-lg border border-gold/20 overflow-hidden">
      <div style={containerStyle}>
        <iframe
          src={`https://www.youtube.com/embed/${videoId}`}
          style={iframeStyle}
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
      </div>
    </div>
  );
}

function FacebookIframe({ embedUrl, videoAspect }: { embedUrl: string; videoAspect: VideoAspect }) {
  let containerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    backgroundColor: 'black',
  };
  let iframeStyle: React.CSSProperties = { border: 0 };

  if (videoAspect === "landscape") {
    containerStyle.aspectRatio = '16/9';
    iframeStyle.width = '100%';
    iframeStyle.height = '100%';
  } else if (videoAspect === "portrait") {
    containerStyle.aspectRatio = '9/16';
    containerStyle.maxHeight = '80vh';
    containerStyle.margin = '0 auto';
    iframeStyle.width = '100%';
    iframeStyle.height = '100%';
  } else {
    containerStyle.minHeight = '300px';
    iframeStyle.width = '100%';
    iframeStyle.height = '100%';
  }

  return (
    <div className="w-full rounded-lg border border-gold/20 overflow-hidden">
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

function GoogleDriveIframe({ embedUrl, videoAspect }: { embedUrl: string; videoAspect: VideoAspect }) {
  let containerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    backgroundColor: 'black',
  };
  let iframeStyle: React.CSSProperties = { border: 0 };

  if (videoAspect === "landscape") {
    containerStyle.aspectRatio = '16/9';
    iframeStyle.width = '100%';
    iframeStyle.height = '100%';
  } else if (videoAspect === "portrait") {
    containerStyle.aspectRatio = '9/16';
    containerStyle.maxHeight = '80vh';
    containerStyle.margin = '0 auto';
    iframeStyle.width = '100%';
    iframeStyle.height = '100%';
  } else {
    containerStyle.minHeight = '300px';
    iframeStyle.width = '100%';
    iframeStyle.height = '100%';
  }

  return (
    <div className="w-full rounded-lg border border-gold/20 overflow-hidden">
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

  switch (type) {
    case "youtube":
      return <YouTubeIframe videoId={src} videoAspect={videoAspect} />;
    case "facebook":
      return <FacebookIframe embedUrl={src} videoAspect={videoAspect} />;
    case "googledrive":
      return <GoogleDriveIframe embedUrl={src} videoAspect={videoAspect} />;
    case "streamtape":
    case "video": {
      // توسيط الفيديو المباشر عمودياً وأفقياً
      const containerStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        backgroundColor: 'black',
        minHeight: '300px',
      };
      let videoStyle: React.CSSProperties = { display: 'block', maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' };
      if (videoAspect === "landscape") {
        containerStyle.aspectRatio = '16/9';
        videoStyle.width = '100%';
        videoStyle.height = '100%';
      } else if (videoAspect === "portrait") {
        containerStyle.aspectRatio = '9/16';
        containerStyle.maxHeight = '80vh';
        containerStyle.margin = '0 auto';
        videoStyle.width = '100%';
        videoStyle.height = '100%';
      }
      return (
        <div className="w-full rounded-lg border border-gold/20 overflow-hidden">
          <div style={containerStyle}>
            <video src={src} style={videoStyle} controls playsInline>
              متصفحك لا يدعم الفيديو.
            </video>
          </div>
        </div>
      );
    }
    case "image":
      return <img src={src} alt={alt} className="w-full rounded-lg border border-gold/20" />;
    default:
      return null;
  }
}
