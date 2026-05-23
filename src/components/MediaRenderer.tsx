"use client";
import { useState, useEffect } from "react";

// ... (دوال مساعدة يوتيوب وتيرابوكس تبقى كما هي)

// دالة جديدة للتعرف على رابط Streamtape
function isStreamTapeUrl(url) {
  return /streamtape\.com/i.test(url);
}

// دالة محدثة لجلب الرابط المُتوسط، تدعم الآن كلاً من Streamtape و Terabox
async function getProxiedVideoUrl(shareUrl, platform) {
  try {
    let functionName = '';
    if (platform === 'streamtape') functionName = 'streamtape';
    else if (platform === 'terabox') functionName = 'terabox';
    else return null;

    // 1. طلب الرابط المباشر من الدالة
    const infoRes = await fetch(`/.netlify/functions/${functionName}?url=${encodeURIComponent(shareUrl)}`);
    const infoData = await infoRes.json();
    if (!infoData.success) return null;
    
    // 2. إرجاع رابط الدالة نفسها مع تفعيل وضع "direct" لتوسيط الفيديو
    return `/.netlify/functions/${functionName}?direct=1&url=${encodeURIComponent(shareUrl)}`;
  } catch (err) {
    console.error(`Error in getProxiedVideoUrl for ${platform}:`, err);
    return null;
  }
}

export function MediaRenderer({ url, alt = "" }) {
  if (!url) return null;

  // 1. يوتيوب
  // ... (الكود كما هو)

  // 2. معالجة StreamTape
  if (isStreamTapeUrl(url)) {
    const [videoSrc, setVideoSrc] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
      let isMounted = true;
      setLoading(true);
      setError(false);
      getProxiedVideoUrl(url, 'streamtape')
        .then(src => {
          if (!isMounted) return;
          if (src) setVideoSrc(src);
          else setError(true);
          setLoading(false);
        })
        .catch(() => {
          if (isMounted) setError(true);
          setLoading(false);
        });
      return () => { isMounted = false; };
    }, [url]);

    if (loading) return <div className="p-8 text-center">جاري تجهيز الفيديو...</div>;
    if (error || !videoSrc) {
      return (
        <div className="p-8 text-center text-red-400">
          لا يمكن عرض الفيديو. <a href={url} target="_blank" rel="noopener noreferrer">فتح الرابط ↗</a>
        </div>
      );
    }
    return (
      <video key={videoSrc} controls className="w-full rounded-lg border border-gold/30 bg-black" style={{ aspectRatio: "16/9" }}>
        <source src={videoSrc} type="video/mp4" />
      </video>
    );
  }

  // 3. معالجة Terabox
  // ... (الكود الخاص بتيرابوكس، يمكنك تعديله لينادي getProxiedVideoUrl(url, 'terabox'))

  // 4. روابط فيديو وصور مباشرة
  // ... (الكود كما هو)

  return null;
}
