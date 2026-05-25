exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  const shareUrl = event.queryStringParameters?.url;
  const isDirectRequest = event.queryStringParameters?.direct === '1';

  if (!shareUrl) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing URL' }) };
  }

  try {
    // استخراج معرف الملف
    let fileId = null;
    const matchFile = shareUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (matchFile) {
      fileId = matchFile[1];
    } else {
      const matchOpen = shareUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (matchOpen) fileId = matchOpen[1];
    }

    if (!fileId) {
      throw new Error('Invalid Google Drive URL: could not extract file ID');
    }

    console.log(`Processing Google Drive file ID: ${fileId}`);

    // جلب الرابط المباشر الحقيقي من Google
    // نطلب صفحة المعلومات أولاً
    const infoUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    const infoRes = await fetch(infoUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    let directUrl = null;
    const html = await infoRes.text();

    // البحث عن رابط التحميل المباشر في الصفحة
    // نمط 1: window.location.href = "..."
    const windowMatch = html.match(/window\.location\.href\s*=\s*"([^"]+)"/);
    if (windowMatch) {
      directUrl = windowMatch[1];
    }

    // نمط 2: href="..."
    const hrefMatch = html.match(/href="([^"]+download[^"]+)"/);
    if (!directUrl && hrefMatch) {
      directUrl = hrefMatch[1];
    }

    // نمط 3: رابط مباشر من drive.usercontent
    if (!directUrl) {
      directUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`;
    }

    console.log(`Direct URL found: ${directUrl?.substring(0, 100)}...`);

    if (!isDirectRequest) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, direct_url: directUrl }),
      };
    }

    // جلب الفيديو وإعادته كـ base64
    const videoRes = await fetch(directUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    if (!videoRes.ok) {
      throw new Error(`Drive returned ${videoRes.status}`);
    }

    const buffer = await videoRes.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': videoRes.headers.get('content-type') || 'video/mp4',
        'Content-Disposition': 'inline',
      },
      body: base64,
      isBase64Encoded: true,
    };
  } catch (err) {
    console.error('Google Drive proxy error:', err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: err.message }),
    };
  }
};
