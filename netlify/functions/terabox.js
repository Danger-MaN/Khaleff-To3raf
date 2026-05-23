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
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing Terabox URL' }) };
  }

  try {
    // 1. الحصول على الرابط المباشر من API العام
    const apiUrl = `https://terabox-worker.robinkumarshakya103.workers.dev/api?url=${encodeURIComponent(shareUrl)}`;
    const apiRes = await fetch(apiUrl);
    const apiData = await apiRes.json();

    if (!apiData.success || !apiData.files || apiData.files.length === 0) {
      throw new Error('API did not return video data');
    }

    const directUrl = apiData.files[0].streaming_url || apiData.files[0].download_url;
    if (!directUrl) throw new Error('No streaming URL in API response');

    console.log(`Direct URL obtained: ${directUrl.substring(0, 100)}...`);

    // 2. إذا كان الطلب هو الفيديو نفسه (video=1) نقوم بإعادة توجيه الفيديو (proxying)
    if (isVideoRequest) {
      console.log(`Proxying video from ${directUrl}`);
      
      // جلب الفيديو من المصدر الأصلي
      const videoRes = await fetch(directUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Referer': 'https://www.terabox.com/',
        },
      });

      if (!videoRes.ok) {
        throw new Error(`Failed to fetch video: ${videoRes.status}`);
      }

      // إعادة الفيديو مباشرة مع رؤوس صحيحة
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': videoRes.headers.get('Content-Type') || 'video/mp4',
          'Content-Disposition': 'inline',
          'Cache-Control': 'public, max-age=3600',
          'Accept-Ranges': 'bytes',
        },
        body: await videoRes.arrayBuffer(),
        isBase64Encoded: false,  // Netlify يتعامل مع ArrayBuffer مباشرة
      };
    }

    // 3. إذا لم يكن طلب فيديو، نعيد الرابط المباشر JSON
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, direct_url: directUrl }),
    };

  } catch (err) {
    console.error('Terabox proxy error:', err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: err.message }),
    };
  }
};
