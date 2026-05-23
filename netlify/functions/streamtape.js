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
  const isVideoRequest = event.queryStringParameters?.video === '1';

  if (!shareUrl) {
    return { statusCode: 400, body: 'Missing URL' };
  }

  try {
    // استخراج معرّف الفيديو من الرابط
    const videoIdMatch = shareUrl.match(/streamtape\.com\/v\/([a-zA-Z0-9]+)/);
    if (!videoIdMatch) throw new Error('Invalid StreamTape URL');
    const videoId = videoIdMatch[1];
    
    // جلب صفحة الفيديو
    const pageUrl = `https://streamtape.com/v/${videoId}`;
    const pageRes = await fetch(pageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    const html = await pageRes.text();

    // استخراج الرابط المباشر
    // StreamTape يضع الرابط عادة في عنصر video source أو في متغير JavaScript
    let videoUrl = null;
    
    // محاولة 1: البحث عن source src
    const srcMatch = html.match(/<source\s+src="([^"]+\.mp4[^"]*)"/i);
    if (srcMatch) videoUrl = srcMatch[1];
    
    // محاولة 2: البحث عن رابط mp4
    if (!videoUrl) {
      const mp4Match = html.match(/https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*/i);
      if (mp4Match) videoUrl = mp4Match[0];
    }
    
    // محاولة 3: البحث في كود JavaScript (نمط شائع)
    if (!videoUrl) {
      const jsMatch = html.match(/file\s*:\s*"([^"]+\.mp4[^"]+)"/i);
      if (jsMatch) videoUrl = jsMatch[1];
    }

    if (!videoUrl) {
      console.error('Could not extract video URL. HTML snippet:', html.substring(0, 500));
      throw new Error('No video URL found');
    }

    console.log(`Found video URL: ${videoUrl.substring(0, 100)}...`);

    // إذا كان الطلب هو الفيديو نفسه (للوساطة)
    if (isVideoRequest) {
      const videoRes = await fetch(videoUrl, {
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

    // إرجاع الرابط المباشر
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, video_url: videoUrl }),
    };
  } catch (err) {
    console.error('Error:', err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: err.message }),
      headers,
    };
  }
};
