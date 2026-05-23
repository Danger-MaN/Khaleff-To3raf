"use client";

import { useState, useEffect } from "react";

// --- إعدادات الخادم الوسيط (Proxy) ---
// 🔴 هام جداً: استبدل الرابط أدناه برابط الخادم الوسيط (Worker) الخاص بك بعد إنشائه
const TERABOX_WORKER = "https://terabox.dangerhelp10.workers.dev/"; // <-- غيّر هذا الرابط

// دالة مساعدة لجلب الرابط المباشر من الخادم الوسيط
async function fetchTeraboxDirectUrl(shareUrl: string): Promise<string | null> {
    try {
        const response = await fetch(`${TERABOX_WORKER}?url=${encodeURIComponent(shareUrl)}`);
        const data = await response.json();
        console.log("Worker response:", data);
        if (data.success && data.streaming_url) {
            return data.streaming_url;
        }
        return null;
    } catch (error) {
        console.error("Terabox worker error:", error);
        return null;
    }
}

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

function getTeraboxShareId(url: string): string | null {
    const teraboxDomains = /(terabox|teraboxapp|terabox\.app|1024terabox|dubox|4funbox|mirrobox|nephobox|momerybox|tibibox|sharebox)\./i;
    if (!teraboxDomains.test(url)) return null;

    const patterns = [
        /[?&]surl=([a-zA-Z0-9_-]+)/,
        /\/s\/1?([a-zA-Z0-9_-]+)/,
        /\/sharing\/link\?surl=([a-zA-Z0-9_-]+)/,
    ];
    for (const p of patterns) {
        const m = url.match(p);
        if (m) return m[1];
    }
    return null;
}

interface MediaRendererProps {
    url?: string;
    alt?: string;
}

export function MediaRenderer({ url, alt = "" }: MediaRendererProps) {
    if (!url) return null;

    // --- دعم يوتيوب ---
    const ytId = getYouTubeId(url);
    if (ytId) {
        return (
            <div className="relative w-full overflow-hidden rounded-lg shadow-mystic border border-gold/30" style={{ aspectRatio: "16/9" }}>
                <iframe
                    src={`https://www.youtube.com/embed/${ytId}`}
                    title="YouTube video"
                    className="absolute inset-0 h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                />
            </div>
        );
    }

    // --- دعم تيرابوكس ---
    const tbShareId = getTeraboxShareId(url);
    if (tbShareId) {
        const [videoUrl, setVideoUrl] = useState<string | null>(null);
        const [loading, setLoading] = useState(true);
        const [error, setError] = useState(false);

        useEffect(() => {
            let isMounted = true;
            setLoading(true);
            setError(false);
            fetchTeraboxDirectUrl(url)
                .then((result) => {
                    if (isMounted) {
                        if (result) setVideoUrl(result);
                        else setError(true);
                        setLoading(false);
                    }
                })
                .catch(() => {
                    if (isMounted) {
                        setError(true);
                        setLoading(false);
                    }
                });
            return () => { isMounted = false; };
        }, [url]);

        if (loading) {
            return (
                <div className="w-full rounded-lg shadow-mystic border border-gold/30 bg-black/20 flex items-center justify-center p-8" style={{ aspectRatio: "16/9" }}>
                    <span className="text-gold/70 text-sm">جاري تحميل الوسائط من Terabox...</span>
                </div>
            );
        }

        if (error || !videoUrl) {
            return (
                <div className="w-full rounded-lg shadow-mystic border border-gold/30 bg-black/20 flex items-center justify-center p-8 flex-col gap-2" style={{ aspectRatio: "16/9" }}>
                    <span className="text-red-400/70 text-sm">حدث خطأ في تحميل الوسائط من Terabox</span>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-gold text-xs underline">
                        فتح الرابط في Terabox ↗
                    </a>
                </div>
            );
        }

        return (
            <video
                key={videoUrl}
                controls
                className="w-full rounded-lg shadow-mystic border border-gold/30 bg-black"
                style={{ aspectRatio: "16/9" }}
            >
                <source src={videoUrl} type="video/mp4" />
                متصفحك لا يدعم تشغيل الفيديو.
            </video>
        );
    }

    // --- دعم روابط فيديو وصور مباشرة ---
    if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(url)) {
        return (
            <video controls className="w-full rounded-lg shadow-mystic border border-gold/30 bg-black" style={{ aspectRatio: "16/9" }}>
                <source src={url} />
            </video>
        );
    }

    if (/\.(jpe?g|png|webp|gif|avif|svg)(\?|$)/i.test(url) || /^https?:\/\//.test(url)) {
        return (
            <img src={url} alt={alt} loading="lazy" className="w-full rounded-lg shadow-mystic border border-gold/30 object-cover" />
        );
    }

    return null;
}
