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

  try {
    // 1. استخدام API للحصول على الرابط الوسيط
    const apiUrl = `https://terabox-worker.robinkumarshakya103.workers.dev/api?url=${encodeURIComponent(shareUrl)}`;
    const apiRes = await fetch(apiUrl);
    const apiData = await apiRes.json();

    if (!apiData.success || !apiData.files || apiData.files.length === 0) {
      throw new Error('No video data');
    }

    let streamUrl = apiData.files[0].streaming_url;
    if (!streamUrl) streamUrl = apiData.files[0].download_url;
    if (!streamUrl) throw new Error('No streaming URL');

    console.log(`Stream URL: ${streamUrl.substring(0, 100)}...`);

    // 2. إذا كان الطلب هو الفيديو نفسه، نجلب الفيديو ونعيده
    if (isVideoRequest) {
      console.log(`Fetching video from stream URL...`);
      const videoRes = await fetch(streamUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });

      if (!videoRes.ok) throw new Error(`HTTP ${videoRes.status}`);

      const buffer = await videoRes.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');

      console.log(`Video fetched successfully, size: ${buffer.byteLength} bytes`);

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

    // 3. إرجاع الرابط الوسيط للمستخدم
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, direct_url: streamUrl }),
    };
  } catch (err) {
    console.error('Error:', err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: err.message }),
    };
  }
};
