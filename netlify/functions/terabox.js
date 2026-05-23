// netlify/functions/terabox.js
// حل مستقل تماماً باستخدام مفتاح الكوكيز فقط - تم تحديث طريقة الاستخراج

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

    // 3. طريقة جديدة لاستخراج الرابط - البحث عن الرابط في أي مكان في الصفحة
    // البحث عن رابط يبدأ بـ https://d*.freeterabox.com/file/...
    const urlPattern = /https:\/\/d[0-9]+\.freeterabox\.com\/file\/[a-zA-Z0-9]+[^\s"'<>]+/g;
    const matches = html.match(urlPattern);
    
    let finalUrl = null;
    if (matches && matches.length > 0) {
      // نأخذ أول رابط موجود (عادة هو رابط الفيديو)
      finalUrl = matches[0];
      console.log(`Found direct URL via pattern: ${finalUrl.substring(0, 100)}...`);
    }

    // إذا لم نجد بالطريقة الأولى، نبحث عن dlink في الـ JSON
    if (!finalUrl) {
      // البحث عن أي رابط طويل يحتوي على .mp4
      const mp4Pattern = /https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*/gi;
      const mp4Matches = html.match(mp4Pattern);
      if (mp4Matches && mp4Matches.length > 0) {
        finalUrl = mp4Matches[0];
        console.log(`Found MP4 URL: ${finalUrl.substring(0, 100)}...`);
      }
    }

    // محاولة أخيرة: البحث عن dlink في أي script
    if (!finalUrl) {
      const dlinkPattern = /dlink["']?\s*:\s*["']([^"']+)["']/;
      const dlinkMatch = html.match(dlinkPattern);
      if (dlinkMatch) {
        finalUrl = dlinkMatch[1];
        console.log(`Found dlink: ${finalUrl.substring(0, 100)}...`);
      }
    }

    if (!finalUrl) {
      // طباعة جزء من الصفحة للتصحيح
      console.error(`Could not find video URL. HTML snippet: ${html.substring(0, 500)}`);
      throw new Error('No video URL found in page');
    }

    // 4. إذا كان الطلب هو الفيديو نفسه
    if (isVideoRequest) {
      console.log(`Proxying video from: ${finalUrl.substring(0, 100)}...`);
      const videoRes = await fetch(finalUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Referer': 'https://www.terabox.com/',
        },
      });

      if (!videoRes.ok) throw new Error(`HTTP ${videoRes.status}: ${videoRes.statusText}`);

      const buffer = await videoRes.arrayBuffer();
      console.log(`Video fetched successfully. Size: ${buffer.byteLength} bytes`);

      if (buffer.byteLength < 10240) {
        const text = Buffer.from(buffer).toString('utf-8');
        console.error(`Small response (possibly error): ${text.substring(0, 200)}`);
        throw new Error('Received error page instead of video');
      }

      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': 'video/mp4',
          'Content-Disposition': 'inline',
          'Content-Length': buffer.byteLength,
        },
        body: Buffer.from(buffer).toString('base64'),
        isBase64Encoded: true,
      };
    }

    // إرجاع الرابط للمستخدم
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, direct_url: finalUrl }),
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
