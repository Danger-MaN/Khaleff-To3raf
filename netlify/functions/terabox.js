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
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing URL' }) };
  }

  try {
    // 1. استخدام واجهة المشروع الرسمية (الأكثر استقرارًا حاليًا)
    // ملاحظة: هذا الرابط هو API عام لمشروع Terabox Downloader، وهو خدمة مجانية
    const apiUrl = `https://terabox-dl.vercel.app/api?url=${encodeURIComponent(shareUrl)}`;
    
    console.log(`Fetching data from API...`);
    const apiResponse = await fetch(apiUrl);
    const apiData = await apiResponse.json();

    if (!apiData.success || !apiData.response || apiData.response.length === 0) {
      throw new Error('API failed to get video data');
    }

    const videoInfo = apiData.response[0];
    const videoUrl = videoInfo.resolutions?.fast?.download || videoInfo.download_link;
    
    if (!videoUrl) {
      throw new Error('No video URL found in API response');
    }

    console.log(`Video URL obtained successfully.`);

    // 2. إذا كان الطلب هو الفيديو نفسه (للتوسيط وحل CORS)
    if (isVideoRequest) {
      console.log(`Proxying video from ${videoUrl.substring(0, 80)}...`);
      const videoResponse = await fetch(videoUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });

      if (!videoResponse.ok) throw new Error(`HTTP ${videoResponse.status}`);

      const buffer = await videoResponse.arrayBuffer();
      console.log(`Video fetched successfully. Size: ${buffer.byteLength} bytes.`);

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

    // 3. إرجاع الرابط المباشر للمستخدم (للاستخدام الأولي)
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, direct_url: videoUrl }),
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
