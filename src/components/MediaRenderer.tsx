"use client";

import { useEffect, useState, useRef } from "react";
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

// ------------------- دوال الفيسبوك -------------------
function isFacebookVideoUrl(url: string): boolean {
  return /(facebook\.com.*\/videos\/|fb\.watch\/|facebook\.com\/watch\/\?v=)/i.test(url);
}

function getFacebookEmbedUrl(url: string): string | null {
  try {
    // نمط 1: facebook.com/PAGE_ID/videos/VIDEO_ID
    const videoMatch = url.match(/facebook\.com\/(?:[^\/]+\/)?videos\/(?:[^\/]+\/)?(\d+)/i);
    if (videoMatch && videoMatch[1]) {
      const videoId = videoMatch[1];
      const pageMatch = url.match(/facebook\.com\/([^\/?]+)/i);
      const pageId = pageMatch && pageMatch[1] !== 'videos' && pageMatch[1] !== 'watch' ? pageMatch[1] : 'facebook';
      return `https://www.facebook.com/plugins/video.php?href=https://www.facebook.com/${pageId}/videos/${videoId}/`;
    }

    // نمط 2: facebook.com/watch/?v=VIDEO_ID
    const watchMatch = url.match(/facebook\.com\/watch\/\?v=(\d+)/i);
    if (watchMatch && watchMatch[1]) {
      const videoId = watchMatch[1];
      return `https://www.facebook.com/plugins/video.php?href=https://www.facebook.com/facebook/videos/${videoId}/`;
    }

    // نمط 3: fb.watch/xxxxx (روابط مختصرة)
    const fbWatchMatch = url.match(/fb\.watch\/([a-zA-Z0-9]+)/i);
    if (fbWatchMatch) {
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}`;
    }

    return null;
  } catch (error) {
    console.error("Error extracting Facebook video ID:", error);
    return null;
  }
}

// ------------------- دوال Google Drive -------------------
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

// ------------------- المكون الرئيسي -------------------
interface MediaRendererProps {
  url?: string;
  alt?: string;
  videoAspect?: VideoAspect;
}

export function MediaRenderer({ url, alt = "", videoAspect = "auto" }: MediaRendererProps) {
  const [finalSrc, setFinalSrc] = useState<string | null>(null);
  const [isIframe, setIsIframe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null); // لتخزين النسبة المستنتجة
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // تحديد مصدر المحتوى
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setFinalSrc(null);
      setIsIframe(false);
      setError(false);
      if (!url) return;

      // 1. YouTube
      const yt = getYouTubeId(url);
      if (yt) {
        setFinalSrc(`https://www.youtube.com/embed/${yt}`);
        setIsIframe(true);
        return;
      }

      // 2. Facebook Video
      if (isFacebookVideoUrl(url)) {
        const embedUrl = getFacebookEmbedUrl(url);
        if (embedUrl) {
          setFinalSrc(embedUrl);
          setIsIframe(true);
          return;
        }
        // إذا فشل الاستخراج، نستمر لمعالجة الخيارات الأخرى
      }

      // 3. Google Drive
      if (isGoogleDriveUrl(url)) {
        const embedUrl = getGoogleDriveEmbedUrl(url);
        if (embedUrl) {
          setFinalSrc(embedUrl);
          setIsIframe(true);
          return;
        }
        setError(true);
        return;
      }

      // 4. StreamTape
      if (isStreamTapeUrl(url)) {
        setLoading(true);
        const src = await getStreamTapeProxiedUrl(url);
        if (src && mounted) setFinalSrc(src);
        else if (mounted) setError(true);
        setLoading(false);
        return;
      }

      // 5. Terabox (غير مدعوم)
      if (isTeraboxUrl(url)) {
        setError(true);
        return;
      }

      // 6. روابط مباشرة للفيديو
      if (/\.(mp4|webm|mov|ogg)$/i.test(url)) {
        setFinalSrc(url);
        return;
      }

      // 7. صور
      if (/\.(jpg|jpeg|png|gif|webp|avif)$/i.test(url)) {
        setFinalSrc(url);
        return;
      }

      setError(true);
    };
    load();
    return () => { mounted = false; };
  }, [url]);

  // استنتاج نسبة الأبعاد للـ iframe
  useEffect(() => {
    if (!isIframe || !iframeRef.current) return;

    const handleLoad = () => {
      try {
        // محاولة قراءة نسبة الأبعاد من خصائص iframe أو محتواه
        const iframe = iframeRef.current;
        if (iframe && iframe.contentWindow && iframe.contentWindow.document) {
          const videoElement = iframe.contentWindow.document.querySelector('video');
          if (videoElement && videoElement.videoWidth && videoElement.videoHeight) {
            const ratio = videoElement.videoWidth / videoElement.videoHeight;
            setAspectRatio(ratio);
            console.log(`Detected aspect ratio: ${ratio}`);
          }
        }
      } catch (error) {
        // تجاهل أخطاء CORS
        console.log("Cannot access iframe content due to CORS policy.");
      }
    };

    if (iframeRef.current.complete) {
      handleLoad();
    } else {
      iframeRef.current.addEventListener('load', handleLoad);
      return () => iframeRef.current?.removeEventListener('load', handleLoad);
    }
  }, [isIframe, finalSrc]);

  if (loading) return <div className="p-8 text-center text-gold">جاري التحميل...</div>;
  if (error || !finalSrc) return <div className="p-8 text-center text-red-400">لا يمكن عرض المحتوى. <a href={url} target="_blank" rel="noopener noreferrer">فتح الرابط ↗</a></div>;

  // --- iframe (YouTube, Facebook, Google Drive) ---
  if (isIframe) {
    let containerStyle: React.CSSProperties = {};
    let effectiveAspectRatio = aspectRatio;

    // إذا لم نتمكن من استنتاج النسبة، نستخدم نسبة معينة بناءً على الإعداد المختار
    if (!effectiveAspectRatio) {
      if (videoAspect === "landscape") effectiveAspectRatio = 16 / 9;
      else if (videoAspect === "portrait") effectiveAspectRatio = 9 / 16;
      else effectiveAspectRatio = 16 / 9; // نسبة افتراضية للحالة auto
    }

    // تطبيق نسبة الأبعاد المستنتجة
    containerStyle = { position: 'relative', width: '100%', paddingBottom: `${(1 / effectiveAspectRatio) * 100}%` };

    return (
      <div className="w-full rounded-lg border border-gold/20 bg-black overflow-hidden">
        <div style={containerStyle}>
          <iframe
            ref={iframeRef}
            src={finalSrc}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>
      </div>
    );
  }

  // --- الصور ---
  if (/\.(jpg|jpeg|png|gif|webp|avif)$/i.test(finalSrc)) {
    return <img src={finalSrc} alt={alt} className="w-full rounded-lg border border-gold/20" />;
  }

  // --- الفيديو المباشر (StreamTape, MP4, إلخ) ---
  let videoStyle: React.CSSProperties = { width: '100%', height: 'auto' };
  if (videoAspect === "portrait") {
    videoStyle = { height: '80vh', width: 'auto', margin: '0 auto' };
  }

  return (
    <div className="w-full bg-black rounded-lg border border-gold/20 overflow-hidden">
      <video
        src={finalSrc}
        style={videoStyle}
        controls
        playsInline
        className="w-full h-auto"
      >
        متصفحك لا يدعم الفيديو.
      </video>
    </div>
  );
}
