exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
  };

  const shareUrl = event.queryStringParameters?.url;
  if (!shareUrl) {
    return { statusCode: 400, body: 'Missing URL' };
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
    if (!surl) throw new Error('Invalid URL');

    const pageUrl = `https://www.terabox.com/sharing/link?surl=${surl}`;
    
    // جلب الصفحة
    const pageRes = await fetch(pageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Cookie': process.env.TERABOX_COOKIE || '',
      },
    });

    let html = await pageRes.text();
    
    // إضافة كود JavaScript لإزالة أي عناصر تمنع العرض
    // وإجبار الفيديو على التشغيل التلقائي
    const injectCode = `
    <script>
      // إزالة أي overlay أو popup
      setTimeout(() => {
        const overlays = document.querySelectorAll('.modal, .overlay, .popup, [class*="modal"], [class*="overlay"]');
        overlays.forEach(el => el.remove());
        // محاولة تشغيل الفيديو تلقائياً
        const video = document.querySelector('video');
        if(video) video.play();
      }, 1000);
    </script>
    `;
    
    // إضافة الكود قبل </body>
    html = html.replace('</body>', `${injectCode}</body>`);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html',
        'X-Frame-Options': 'ALLOWALL', // السماح بالتضمين
        'Content-Security-Policy': "frame-ancestors *", // السماح لجميع المواقع بتضمينها
      },
      body: html,
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: err.message };
  }
};
