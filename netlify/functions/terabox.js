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
    // 1. الحصول على الرابط الوسيط من API العام
    const apiUrl = `https://terabox-worker.robinkumarshakya103.workers.dev/api?url=${encodeURIComponent(shareUrl)}`;
    const apiRes = await fetch(apiUrl);
    const apiData = await apiRes.json();

    if (!apiData.success || !apiData.files || apiData.files.length === 0) {
      throw new Error('API did not return video data');
    }

    let directUrl = apiData.files[0].streaming_url || apiData.files[0].download_url;
    if (!directUrl) throw new Error('No streaming URL');

    console.log(`Initial direct URL: ${directUrl.substring(0, 100)}...`);

    // 2. متابعة إعادة التوجيه (قد يكون الرابط وسيطاً)
    const followRes = await fetch(directUrl, { method: 'HEAD', redirect: 'follow' });
    const finalUrl = followRes.url;
    console.log(`Final video URL: ${finalUrl.substring(0, 100)}...`);

    // 3. إذا كان الطلب هو الفيديو نفسه (video=1) نقوم ببروكسيه
    if (isVideoRequest) {
      console.log(`Proxying video from final URL`);
      const videoRes = await fetch(finalUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });

      if (!videoRes.ok) throw new Error(`HTTP ${videoRes.status}`);

      // تحويل البيانات إلى base64 لأن Netlify Functions تتعامل معه أفضل
      const buffer = await videoRes.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');

      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': videoRes.headers.get('Content-Type') || 'video/mp4',
          'Content-Disposition': 'inline',
        },
        body: base64,
        isBase64Encoded: true,
      };
    }

    // 4. إعادة الرابط النهائي للمستخدم (على شكل JSON)
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
