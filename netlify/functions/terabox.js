exports.handler = async (event) => {
  const params = event.queryStringParameters;
  const shareUrl = params?.url;
  const isEmbed = params?.embed === '1';

  if (!shareUrl) {
    return { statusCode: 400, body: 'Missing URL' };
  }

  const userCookie = process.env.TERABOX_COOKIE;
  if (!userCookie) {
    return { statusCode: 500, body: 'Server configuration: missing cookie' };
  }

  try {
    // استخراج surl
    let surl = null;
    const match1 = shareUrl.match(/[?&]surl=([a-zA-Z0-9_-]+)/);
    if (match1) surl = match1[1];
    else {
      const match2 = shareUrl.match(/\/s\/1?([a-zA-Z0-9_-]+)/);
      if (match2) surl = match2[1];
    }
    if (!surl) throw new Error('Cannot extract surl');

    // جلب الصفحة للحصول على الرابط المباشر
    const pageUrl = `https://www.terabox.com/sharing/link?surl=${surl}`;
    const pageRes = await fetch(pageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Cookie': userCookie,
      },
    });
    const html = await pageRes.text();

    // استخراج الرابط المباشر للفيديو
    let videoUrl = null;
    
    // طريقة 1: رابط freeterabox.com
    const urlPattern = /https:\/\/d[0-9]+\.freeterabox\.com\/file\/[a-zA-Z0-9]+[^\s"'<>]+\.mp4[^\s"'<>]*/i;
    const match = html.match(urlPattern);
    if (match) videoUrl = match[0];
    
    // طريقة 2: البحث عن dlink
    if (!videoUrl) {
      const dlinkMatch = html.match(/dlink["']?\s*:\s*["']([^"']+\.mp4[^"']*)["']/i);
      if (dlinkMatch) videoUrl = dlinkMatch[1];
    }
    
    // طريقة 3: البحث عن أي رابط mp4
    if (!videoUrl) {
      const mp4Match = html.match(/https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*/i);
      if (mp4Match) videoUrl = mp4Match[0];
    }

    if (!videoUrl) {
      console.error('Could not find video URL. HTML snippet:', html.substring(0, 500));
      throw new Error('No video URL found');
    }

    console.log(`Found video URL: ${videoUrl.substring(0, 100)}...`);

    // إذا كان طلب embed، نعيد صفحة HTML بسيطة تحتوي على الفيديو
    if (isEmbed) {
      const embedHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Video Player</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      background: #000; 
      display: flex; 
      justify-content: center; 
      align-items: center; 
      min-height: 100vh;
      font-family: system-ui, -apple-system, sans-serif;
    }
    .video-container {
      width: 100%;
      max-width: 1280px;
      margin: 0 auto;
    }
    video {
      width: 100%;
      height: auto;
      display: block;
    }
    .error {
      color: #ff4444;
      text-align: center;
      padding: 20px;
    }
  </style>
</head>
<body>
  <div class="video-container">
    <video controls autoplay>
      <source src="${videoUrl}" type="video/mp4">
      <div class="error">Your browser does not support the video tag.</div>
    </video>
  </div>
  <script>
    // محاولة تشغيل الفيديو تلقائياً
    document.addEventListener('DOMContentLoaded', function() {
      const video = document.querySelector('video');
      if(video) {
        video.play().catch(e => console.log('Autoplay prevented:', e));
      }
    });
  </script>
</body>
</html>`;

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'text/html',
          'X-Frame-Options': 'ALLOWALL',
        },
        body: embedHtml,
      };
    }

    // إرجاع الرابط المباشر كـ JSON
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true, video_url: videoUrl }),
    };
  } catch (err) {
    console.error('Error:', err.message);
    return {
      statusCode: 500,
      body: `<html><body style="background:#000;color:#fff;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;"><div>Error: ${err.message}<br><a href="${shareUrl}" target="_blank">Open in Terabox</a></div></body></html>`,
      headers: { 'Content-Type': 'text/html' },
    };
  }
};
