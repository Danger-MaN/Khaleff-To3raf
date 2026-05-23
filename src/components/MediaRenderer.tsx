"use client";

import { useState, useEffect } from "react";

// دوال مساعدة لاستخراج المعرفات
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

function isTeraboxUrl(url: string): boolean {
  return /(terabox|1024terabox|teraboxapp|dubox|4funbox)\./i.test(url);
}

// دالة لجلب رابط الفيديو المُتوسط من Netlify Function
async function getProxiedVideoUrl(shareUrl: string): Promise<string | null> {
  try {
    // أولاً: نطلب الرابط المباشر من الدالة
    const proxyRes = await fetch(`/.netlify/functions/terabox?url=${encodeURIComponent(shareUrl)}`);
    const data = await proxyRes.json();
    if (!data.success || !data.direct_url) return null;

    // ثانياً: نستخدم الدالة نفسها لتوسيط الفيديو (نضيف video=1)
    const streamUrl = `/.netlify/functions/terabox?video=1&url=${encodeURIComponent(shareUrl)}`;
    return streamUrl;
  } catch (err) {
    console.error("Error in getProxiedVideoUrl:", err);
    return null;
  }
}

export function MediaRenderer({ url, alt = "" }: { url?: string; alt?: string }) {
  if (!url) return null;

  // يوتيوب
  const ytId = getYouTubeId(url);
  if (ytId) {
    return (
      <div style={{ aspectRatio: "16/9" }} className="relative w-full rounded-lg border border-gold/30 overflow-hidden">
        <iframe
          src={`https://www.youtube.com/embed/${ytId}`}
          className="absolute inset-0 w-full h-full"
          allowFullScreen
        />
      </div>
    );
  }

  // تيرابوكس
  if (isTeraboxUrl(url)) {
    const [videoSrc, setVideoSrc] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
      let active = true;
      setLoading(true);
      setError(false);
      getProxiedVideoUrl(url).then(src => {
        if (!active) return;
        if (src) setVideoSrc(src);
        else setError(true);
        setLoading(false);
      }).catch(() => {
        if (active) setError(true);
        setLoading(false);
      });
      return () => { active = false; };
    }, [url]);

    if (loading) return <div className="p-8 text-center">جاري تحميل الفيديو...</div>;
    if (error || !videoSrc) {
      return (
        <div className="p-8 text-center text-red-400">
          فشل التحميل. <a href={url} target="_blank" rel="noopener noreferrer">افتح الرابط ↗</a>
        </div>
      );
    }
    return (
      <video controls className="w-full rounded-lg border border-gold/30 bg-black" style={{ aspectRatio: "16/9" }}>
        <source src={videoSrc} type="video/mp4" />
      </video>
    );
  }

  // فيديو مباشر
  if (/\.(mp4|webm|mov|ogg)/i.test(url)) {
    return <video controls className="w-full" style={{ aspectRatio: "16/9" }}><source src={url} /></video>;
  }

  // صورة
  if (/\.(jpg|jpeg|png|gif|webp|avif)/i.test(url)) {
    return <img src={url} alt={alt} className="w-full rounded-lg" />;
  }

  return null;
}
