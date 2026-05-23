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
    // استخدام API بديل ومستقر
    // تم تجربة عدة واجهات واختيار الأكثر استقراراً
    const apiUrl = `https://terabox.axfg.workers.dev/api?url=${encodeURIComponent(shareUrl)}`;
    
    console.log(`Calling API: ${apiUrl.substring(0, 80)}...`);
    
    const apiRes = await fetch(apiUrl);
    const apiData = await apiRes.json();

    if (!apiData.success || !apiData.files || apiData.files.length === 0) {
      throw new Error('API returned no video data');
    }

    const videoUrl = apiData.files[0].streaming_url || apiData.files[0].download_url;
    if (!videoUrl) throw new Error('No video URL in API response');

    console.log(`Video URL obtained: ${videoUrl.substring(0, 100)}...`);

    // إذا كان الطلب هو الفيديو نفسه
    if (isVideoRequest) {
      console.log(`Proxying video...`);
      const videoRes = await fetch(videoUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Referer': 'https://www.terabox.com/',
        },
      });

      if (!videoRes.ok) throw new Error(`HTTP ${videoRes.status}`);

      const buffer = await videoRes.arrayBuffer();
      console.log(`Video size: ${buffer.byteLength} bytes`);

      // التحقق من أن الحجم معقول
      if (buffer.byteLength < 10240) {
        const text = Buffer.from(buffer).toString('utf-8');
        console.error(`Small response (error page?): ${text.substring(0, 200)}`);
        throw new Error('Received error page instead of video');
      }

      const base64 = Buffer.from(buffer).toString('base64');

      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': 'video/mp4',
          'Content-Disposition': 'inline',
        },
        body: base64,
        isBase64Encoded: true,
      };
    }

    // إرجاع الرابط للمستخدم
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, direct_url: videoUrl }),
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
