"use client";

import { useState, useEffect } from "react";

interface Props {
    url?: string;
    alt?: string;
}

// دالة استخراج معرف يوتيوب
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

// دالة استخراج معرف المشاركة من رابط تيرابوكس
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

// دالة لجلب رابط الفيديو المباشر من الوظيفة الوسيطة
async function fetchTeraboxVideoUrl(shareUrl: string): Promise<string | null> {
    try {
        // الخطوة 1: استدعاء terabox-proxy للحصول على الرابط المباشر
        const proxyUrl = `/.netlify/functions/terabox-proxy?url=${encodeURIComponent(shareUrl)}`;
        const response = await fetch(proxyUrl);
        const data = await response.json();

        if (!data.success || !data.streaming_url) {
            console.error("Proxy returned no streaming URL:", data);
            return null;
        }

        // الخطوة 2: تمرير الرابط المباشر إلى terabox-stream لتجنب CORS
        const streamUrl = `/.netlify/functions/terabox-stream?url=${encodeURIComponent(data.streaming_url)}`;
        return streamUrl;

    } catch (error) {
        console.error("Terabox fetch error:", error);
        return null;
    }
}

export function MediaRenderer({ url, alt = "" }: Props) {
    if (!url) return null;

    // 1. معالجة يوتيوب
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

    // 2. معالجة تيرابوكس
    const tbShareId = getTeraboxShareId(url);
    if (tbShareId) {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const [videoUrl, setVideoUrl] = useState<string | null>(null);
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const [loading, setLoading] = useState(true);
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const [error, setError] = useState(false);

        // eslint-disable-next-line react-hooks/rules-of-hooks
        useEffect(() => {
            let isMounted = true;
            setLoading(true);
            setError(false);

            fetchTeraboxVideoUrl(url)
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

            return () => {
                isMounted = false;
            };
        }, [url]);

        if (loading) {
            return (
                <div className="w-full rounded-lg shadow-mystic border border-gold/30 bg-black/20 flex items-center justify-center p-8" style={{ aspectRatio: "16/9" }}>
                    <span className="text-gold/70 text-sm">جاري تحميل الفيديو من Terabox...</span>
                </div>
            );
        }

        if (error || !videoUrl) {
            return (
                <div className="w-full rounded-lg shadow-mystic border border-gold/30 bg-black/20 flex items-center justify-center p-8 flex-col gap-2" style={{ aspectRatio: "16/9" }}>
                    <span className="text-red-400/70 text-sm">فشل تحميل الفيديو من Terabox</span>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-gold text-xs underline">
                        فتح الرابط في Terabox ↗
                    </a>
                </div>
            );
        }

        // عرض الفيديو من خلال الـ stream proxy
        return (
            <video
                key={videoUrl}
                controls
                autoPlay={false}
                className="w-full rounded-lg shadow-mystic border border-gold/30 bg-black"
                style={{ aspectRatio: "16/9" }}
            >
                <source src={videoUrl} type="video/mp4" />
                متصفحك لا يدعم تشغيل الفيديو.
            </video>
        );
    }

    // 3. روابط فيديو مباشرة
    if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(url)) {
        return (
            <video
                controls
                className="w-full rounded-lg shadow-mystic border border-gold/30 bg-black"
                style={{ aspectRatio: "16/9" }}
            >
                <source src={url} />
            </video>
        );
    }

    // 4. روابط صور مباشرة
    if (/\.(jpe?g|png|webp|gif|avif|svg)(\?|$)/i.test(url) || /^https?:\/\//.test(url)) {
        return (
            <img
                src={url}
                alt={alt}
                loading="lazy"
                className="w-full rounded-lg shadow-mystic border border-gold/30 object-cover"
            />
        );
    }

    return null;
}
