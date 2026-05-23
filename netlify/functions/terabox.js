// الدالة الرئيسية
exports.handler = async (event) => {
  // إعدادات CORS البسيطة
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // طلب OPTIONS (preflight)
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  // الحصول على المعاملات من الرابط
  const params = event.queryStringParameters;
  const shareUrl = params?.url;
  const isVideoRequest = params?.video === '1';   // إذا كان ?video=1 نعيد الفيديو مباشرة

  if (!shareUrl) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Missing Terabox URL' })
    };
  }

  // جلب الكوكيز من متغيرات البيئة (سيكون لدينا TERABOX_COOKIE)
  const userCookie = process.env.TERABOX_COOKIE;
  if (!userCookie) {
    console.error('TERABOX_COOKIE not set');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server misconfiguration: missing cookie' })
    };
  }

  try {
    // 1. استخراج surl من رابط المشاركة
    let surl = null;
    const match1 = shareUrl.match(/[?&]surl=([a-zA-Z0-9_-]+)/);
    if (match1) surl = match1[1];
    else {
      const match2 = shareUrl.match(/\/s\/1?([a-zA-Z0-9_-]+)/);
      if (match2) surl = match2[1];
    }
    if (!surl) throw new Error('Cannot extract surl from URL');

    console.log(`Extracted surl: ${surl}`);

    // 2. جلب صفحة المشاركة مع الكوكيز
    const pageUrl = `https://www.terabox.com/sharing/link?surl=${surl}`;
    const pageRes = await fetch(pageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Cookie': userCookie,
      },
    });
    const html = await pageRes.text();

    // 3. استخراج الرابط المباشر (dlink) باستخدام regex بسيط
    //    نبحث عن "dlink":"http..."
    let dlink = null;
    const dlinkMatch = html.match(/dlink":"([^"]+)"/);
    if (dlinkMatch) dlink = dlinkMatch[1];
    if (!dlink) {
      // محاولة أخرى: window.pageData
      const pageDataMatch = html.match(/window\.pageData\s*=\s*({.*?});/s);
      if (pageDataMatch) {
        try {
          const pageData = JSON.parse(pageDataMatch[1]);
          if (pageData.list && pageData.list[0] && pageData.list[0].dlink) {
            dlink = pageData.list[0].dlink;
          }
        } catch(e) { console.error('Failed to parse pageData'); }
      }
    }
    if (!dlink) throw new Error('Could not find direct link in page');

    console.log(`Found dlink: ${dlink.substring(0, 100)}...`);

    // 4. متابعة إعادة التوجيه (قد يكون dlink يقوم بإعادة توجيه)
    const linkRes = await fetch(dlink, {
      method: 'HEAD',
      redirect: 'manual',
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    let finalUrl = dlink;
    if (linkRes.status === 301 || linkRes.status === 302) {
      finalUrl = linkRes.headers.get('location');
      console.log(`Redirected to: ${finalUrl.substring(0, 100)}...`);
    }

    // 5. إذا كان الطلب هو طلب فيديو (video=1) نقوم بجلب الفيديو وإعادته
    if (isVideoRequest) {
      console.log(`Proxying video from ${finalUrl}`);
      const videoRes = await fetch(finalUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      const videoBuffer = await videoRes.arrayBuffer();
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': videoRes.headers.get('Content-Type') || 'video/mp4',
          'Content-Disposition': 'inline',
        },
        body: Buffer.from(videoBuffer).toString('base64'),
        isBase64Encoded: true,
      };
    }

    // 6. وإلا نعيد الرابط المباشر على شكل JSON
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, direct_url: finalUrl }),
    };
  } catch (err) {
    console.error('Terabox function error:', err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: err.message }),
    };
  }
};
