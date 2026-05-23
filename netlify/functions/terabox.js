exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  const params = event.queryStringParameters;
  const shareUrl = params?.url;
  const isVideoRequest = params?.video === '1';

  if (!shareUrl) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Missing Terabox URL' })
    };
  }

  try {
    // استخدام API خارجي موثوق للحصول على الرابط المباشر
    const apiUrl = `https://terabox-worker.robinkumarshakya103.workers.dev/api?url=${encodeURIComponent(shareUrl)}`;
    const apiResponse = await fetch(apiUrl);
    const apiData = await apiResponse.json();

    if (!apiData.success || !apiData.files || apiData.files.length === 0) {
      throw new Error('API returned no video data');
    }

    const directUrl = apiData.files[0].streaming_url || apiData.files[0].download_url;
    if (!directUrl) throw new Error('No streaming URL found');

    // إذا كان الطلب هو فيديو (video=1) نقوم بجلب الفيديو وإعادته كـ stream
    if (isVideoRequest) {
      const videoRes = await fetch(directUrl, {
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

    // وإلا نعيد الرابط المباشر
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, direct_url: directUrl }),
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
