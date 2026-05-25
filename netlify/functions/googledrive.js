exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Range',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  const shareUrl = event.queryStringParameters?.url;
  const isDirectRequest = event.queryStringParameters?.direct === '1';

  if (!shareUrl) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Missing URL parameter' }),
    };
  }

  try {
    // استخراج معرف الملف من رابط Google Drive
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

    console.log(`Google Drive file ID: ${fileId}`);

    // رابط التصدير المباشر (للملفات العامة)
    const directUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`;

    if (!isDirectRequest) {
      // إذا كان الطلب للحصول على معلومات فقط
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, direct_url: directUrl, file_id: fileId }),
      };
    }

    // جلب الفيديو من Google Drive وإعادته كـ base64
    console.log(`Proxying video from: ${directUrl.substring(0, 100)}...`);
    const videoRes = await fetch(directUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Range': event.headers.range || '',
      },
    });

    if (!videoRes.ok) {
      throw new Error(`Drive returned HTTP ${videoRes.status}: ${videoRes.statusText}`);
    }

    const contentType = videoRes.headers.get('content-type') || 'video/mp4';
    const buffer = await videoRes.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    console.log(`Video fetched successfully, size: ${buffer.byteLength} bytes`);

    // إعداد رؤوس الاستجابة
    const responseHeaders = {
      ...headers,
      'Content-Type': contentType,
      'Content-Disposition': 'inline',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=3600',
    };

    // إذا كان رداً جزئياً (Range request)
    if (videoRes.status === 206) {
      responseHeaders['Content-Range'] = videoRes.headers.get('content-range');
      return {
        statusCode: 206,
        headers: responseHeaders,
        body: base64,
        isBase64Encoded: true,
      };
    }

    return {
      statusCode: 200,
      headers: responseHeaders,
      body: base64,
      isBase64Encoded: true,
    };
  } catch (err) {
    console.error('Google Drive proxy error:', err.message);
    return {
      statusCode: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: err.message }),
    };
  }
};
