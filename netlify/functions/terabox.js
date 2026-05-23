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

  if (!shareUrl) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing URL' }) };
  }

  // جلب الكوكيز من متغيرات البيئة
  const userCookie = process.env.TERABOX_COOKIE;
  if (!userCookie) {
    console.error('TERABOX_COOKIE not set');
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server cookie missing' }) };
  }

  try {
    // 1. استخراج surl من الرابط
    let surl = null;
    const match1 = shareUrl.match(/[?&]surl=([a-zA-Z0-9_-]+)/);
    if (match1) surl = match1[1];
    else {
      const match2 = shareUrl.match(/\/s\/1?([a-zA-Z0-9_-]+)/);
      if (match2) surl = match2[1];
    }
    if (!surl) throw new Error('Cannot extract surl');
    console.log(`surl: ${surl}`);

    // 2. طلب صفحة المشاركة مع الكوكيز
    const pageUrl = `https://www.terabox.com/sharing/link?surl=${surl}`;
    const pageRes = await fetch(pageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Cookie': userCookie,
        'Accept': 'text/html,application/xhtml+xml',
      },
    });
    const html = await pageRes.text();

    // 3. استخراج الرابط المباشر المتعدد الطرق
    let dlink = null;
    let fileName = null;

    // الطريقة الأولى: window.pageData
    const pageDataMatch = html.match(/window\.pageData\s*=\s*({.*?});/s);
    if (pageDataMatch) {
      try {
        const pageData = JSON.parse(pageDataMatch[1]);
        if (pageData.list && pageData.list[0]) {
          dlink = pageData.list[0].dlink;
          fileName = pageData.list[0].server_filename;
        }
      } catch(e) { console.error('pageData parse error'); }
    }

    // الطريقة الثانية: window.yunData
    if (!dlink) {
      const yunDataMatch = html.match(/window\.yunData\s*=\s*({.*?});/s);
      if (yunDataMatch) {
        try {
          const yunData = JSON.parse(yunDataMatch[1]);
          if (yunData.list && yunData.list[0]) {
            dlink = yunData.list[0].dlink;
            fileName = yunData.list[0].server_filename;
          }
        } catch(e) {}
      }
    }

    // الطريقة الثالثة: البحث المباشر
    if (!dlink) {
      const directMatch = html.match(/dlink":"([^"]+)"/);
      if (directMatch) dlink = directMatch[1];
    }

    if (!dlink) throw new Error('No direct link found in page');
    console.log(`dlink found, length: ${dlink.length}`);

    // 4. متابعة إعادة التوجيه
    let finalUrl = dlink;
    const redirectRes = await fetch(dlink, { method: 'HEAD', redirect: 'manual' });
    if (redirectRes.status === 301 || redirectRes.status === 302) {
      finalUrl = redirectRes.headers.get('location');
      console.log(`Redirected to: ${finalUrl.substring(0, 100)}...`);
    }

    // 5. إذا كان الطلب هو الفيديو نفسه
    if (isVideoRequest) {
      console.log(`Fetching video from: ${finalUrl.substring(0, 100)}...`);
      const videoRes = await fetch(finalUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Referer': 'https://www.terabox.com/',
        },
      });

      if (!videoRes.ok) throw new Error(`HTTP ${videoRes.status}: ${videoRes.statusText}`);

      const buffer = await videoRes.arrayBuffer();
      console.log(`Video fetched: ${buffer.byteLength} bytes`);

      // التحقق: إذا كان الحجم صغيراً جداً (< 10KB) فهذا يعني خطأ
      if (buffer.byteLength < 10240) {
        const text = Buffer.from(buffer).toString('utf-8');
        console.error(`Small response (possibly error page): ${text.substring(0, 200)}`);
        throw new Error('Video fetch returned error page instead of video');
      }

      const base64 = Buffer.from(buffer).toString('base64');

      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': 'video/mp4',
          'Content-Disposition': 'inline',
          'Content-Length': buffer.byteLength,
        },
        body: base64,
        isBase64Encoded: true,
      };
    }

    // 6. إرجاع الرابط للمستخدم
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, direct_url: finalUrl, file_name: fileName }),
    };
  } catch (err) {
    console.error('Terabox error:', err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: err.message }),
    };
  }
};
