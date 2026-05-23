interface Props {
  url?: string;
  alt?: string;
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

// دالة متطورة لاستخراج الـ ID أو الـ SURL من روابط تيرابوكس المختلفة
function getTeraboxId(url: string): string | null {
  if (!/(terabox|teraboxapp|terabox\.app|1024terabox|dubox|4funbox|mirrobox|nephobox|momerybox|tibibox|sharebox)\./i.test(url)) {
    return null;
  }
  const patterns = [
    /[?&]surl=([a-zA-Z0-9_-]+)/,
    /\/s\/1?([a-zA-Z0-9_-]+)/,
    /\/sharing\/link\?surl=([a-zA-Z0-9_-]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  // إذا لم يجد نمطاً، يحاول أخذ الجزء الأخير من الرابط كـ ID احتياطي
  try {
    const parts = url.split('/');
    return parts[parts.length - 1].split('?')[0];
  } catch {
    return null;
  }
}

export function MediaRenderer({ url, alt = "" }: Props) {
  if (!url) return null;

  // 1. التحقق من يوتيوب
  const yt = getYouTubeId(url);
  if (yt) {
    return (
      <div className="relative w-full overflow-hidden rounded-lg shadow-mystic border border-gold/30" style={{ aspectRatio: "16/9" }}>
        <iframe
          src={`https://www.youtube.com/embed/${yt}`}
          title="YouTube video"
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  // 2. التحقق من Terabox
  const tbId = getTeraboxId(url);
  if (tbId) {
    /* ملاحظة هامة بناءً على الفيديو [00:27:49]:
      الروابط المباشرة من تيرابوكس تحتاج خادم خلفي (Backend API) لتوليد رابط مباشر يدعم الـ Streaming.
      يمكنك استخدام الـ API المباشر للمشغل المخصص المتوفر في الفيديو بالشكل التالي:
    */
    const directStreamUrl = `https://terabox.tech/api/watch?id=${tbId}`; 
    // ملاحظة: استبدل النطاق أعلاه برابط الـ API الخاص بك أو الـ API المستخدم في الشرح

    return (
      <div className="relative w-full overflow-hidden rounded-lg shadow-mystic border border-gold/30 bg-black" style={{ aspectRatio: "16/9" }}>
        <video
          src={directStreamUrl}
          controls
          poster={`https://terabox.tech/api/thumbnail?id=${tbId}`} // جلب الصورة المصغرة للملف إن وجدت [00:31:24]
          className="absolute inset-0 h-full w-full"
          preload="metadata"
        />
        <div className="absolute bottom-2 end-2 flex gap-2">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] uppercase tracking-widest px-2 py-1 rounded bg-background/70 text-gold border border-gold/30 hover:bg-background"
          >
            Terabox Link ↗
          </a>
        </div>
      </div>
    );
  }

  // 3. التحقق من روابط الفيديو المباشرة الأخرى
  if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(url)) {
    return (
      <video
        src={url}
        controls
        className="w-full rounded-lg shadow-mystic border border-gold/30 bg-black"
      />
    );
  }

  // 4. التحقق من الصور
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
