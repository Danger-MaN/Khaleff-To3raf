exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  const params = event.queryStringParameters;
  const shareUrl = params?.url;
  const isVideoRequest = params?.video === '1';
  const isEmbedRequest = params?.embed === '1';

  if (!shareUrl) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing URL' }) };
  }

  // جلب الكوكيز من متغيرات البيئة
  const userCookie = process.env.TERABOX_COOKIE;
  if (!userCookie) {
    console.error('TERABOX_COOKIE not set');
    return { statusCode: 500, body: 'Server configuration error' };
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

    const pageUrl = `https://www.terabox.com/sharing/link?surl=${surl}`;
    
    // جلب الصفحة
    const pageRes = await fetch(pageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Cookie': userCookie,
      },
    });
    let html = await pageRes.text();

    // إذا كان طلب تضمين الصفحة (embed)
    if (isEmbedRequest) {
      // إضافة كود لتشغيل الفيديو تلقائياً وإزالة العناصر المزعجة
      const injectCode = `
      <script>
        (function() {
          // إزالة أي overlays أو popups
          const removeOverlays = setInterval(function() {
            const overlays = document.querySelectorAll('.modal, .overlay, .popup, [class*="modal"], [class*="overlay"], .dialog, .mask');
            overlays.forEach(el => el && el.remove && el.remove());
            // محاولة تشغيل الفيديو
            const video = document.querySelector('video');
            if(video && video.paused) {
              video.play().catch(e => console.log('Autoplay blocked'));
            }
          }, 500);
          setTimeout(() => clearInterval(removeOverlays), 10000);
        })();
      </script>
      <style>
        body { overflow: auto !important; }
        .header, .footer, .sidebar { display: none !important; }
        .video-container, .player-container { margin: 0 !important; padding: 0 !important; }
      </style>
      `;
      
      // إضافة الكود قبل </body>
      html = html.replace('</body>', `${injectCode}</body>`);
      
      // إضافة رؤوس تسمح بالتضمين
      const embedHeaders = {
        'Content-Type': 'text/html',
        'X-Frame-Options': 'ALLOWALL',
        'Content-Security-Policy': "frame-ancestors *",
      };
      
      return {
        statusCode: 200,
        headers: embedHeaders,
        body: html,
      };
    }

    // إذا كان طلب فيديو مباشر (video=1) - الكود القديم
    if (isVideoRequest) {
      // البحث عن رابط الفيديو
      const urlPattern = /https:\/\/d[0-9]+\.freeterabox\.com\/file\/[a-zA-Z0-9]+[^\s"'<>]+/g;
      const matches = html.match(urlPattern);
      let finalUrl = matches ? matches[0] : null;
      
      if (!finalUrl) {
        const dlinkMatch = html.match(/dlink["']?\s*:\s*["']([^"']+)["']/);
        if (dlinkMatch) finalUrl = dlinkMatch[1];
      }
      
      if (!finalUrl) throw new Error('No video URL found');
      
      const videoRes = await fetch(finalUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      
      const buffer = await videoRes.arrayBuffer();
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': 'video/mp4',
          'Content-Disposition': 'inline',
        },
        body: Buffer.from(buffer).toString('base64'),
        isBase64Encoded: true,
      };
    }

    // الوضع العادي: إرجاع الرابط المباشر
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'Use ?video=1 or ?embed=1' }),
    };
  } catch (err) {
    console.error('Error:', err.message);
    return { statusCode: 500, body: err.message };
  }
};
