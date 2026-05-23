"use client";
import { useState } from "react";

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

export function MediaRenderer({ url, alt = "" }: { url?: string; alt?: string }) {
  if (!url) return null;

  // يوتيوب
  const ytId = getYouTubeId(url);
  if (ytId) {
    return (
      <div style={{ aspectRatio: "16/9" }} className="relative w-full rounded-lg border border-gold/30 overflow-hidden">
        <iframe src={`https://www.youtube.com/embed/${ytId}`} className="absolute inset-0 w-full h-full" allowFullScreen />
      </div>
    );
  }

  // تيرابوكس - عرض الصفحة كاملة داخل iframe
  if (isTeraboxUrl(url)) {
    const embedUrl = `/.netlify/functions/terabox-embed?url=${encodeURIComponent(url)}`;
    return (
      <div style={{ aspectRatio: "16/9" }} className="relative w-full rounded-lg border border-gold/30 overflow-hidden bg-black">
        <iframe
          src={embedUrl}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
        />
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-2 right-2 text-xs px-2 py-1 rounded bg-black/70 text-white z-10"
        >
          فتح في Terabox ↗
        </a>
      </div>
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
