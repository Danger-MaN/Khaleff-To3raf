"use client";
import { useState, useEffect } from "react";

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

async function getProxiedVideoUrl(shareUrl: string): Promise<string | null> {
  try {
    const res = await fetch(`/.netlify/functions/terabox?url=${encodeURIComponent(shareUrl)}`);
    const data = await res.json();
    if (!data.success || !data.direct_url) return null;
    // نستخدم رابط البروكسي للفيديو (مع video=1)
    return `/.netlify/functions/terabox?video=1&url=${encodeURIComponent(shareUrl)}`;
  } catch (err) {
    console.error(err);
    return null;
  }
}

export function MediaRenderer({ url, alt = "" }: { url?: string; alt?: string }) {
  if (!url) return null;

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

  if (isTeraboxUrl(url)) {
    const [videoSrc, setVideoSrc] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
      let active = true;
      setLoading(true);
      setError(false);
      getProxiedVideoUrl(url)
        .then(src => {
          if (!active) return;
          if (src) setVideoSrc(src);
          else setError(true);
          setLoading(false);
        })
        .catch(() => {
          if (active) setError(true);
          setLoading(false);
        });
      return () => { active = false; };
    }, [url]);

    if (loading) return <div className="p-8 text-center text-gold">جاري تحميل الفيديو...</div>;
    if (error || !videoSrc) {
      return (
        <div className="p-8 text-center text-red-400">
          لا يمكن عرض الفيديو. <a href={url} target="_blank" rel="noopener noreferrer">فتح في Terabox ↗</a>
        </div>
      );
    }
    return (
      <video key={videoSrc} controls className="w-full rounded-lg border border-gold/30 bg-black" style={{ aspectRatio: "16/9" }}>
        <source src={videoSrc} type="video/mp4" />
        متصفحك لا يدعم الفيديو.
      </video>
    );
  }

  if (/\.(mp4|webm|mov|ogg)/i.test(url)) {
    return (
      <video controls className="w-full" style={{ aspectRatio: "16/9" }}>
        <source src={url} />
      </video>
    );
  }

  if (/\.(jpg|jpeg|png|gif|webp|avif)/i.test(url)) {
    return <img src={url} alt={alt} className="w-full rounded-lg" />;
  }

  return null;
}
