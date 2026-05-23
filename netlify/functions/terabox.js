// netlify/functions/terabox.js
// نسخة بسيطة تستخدم API عام (مؤقتاً حتى نجد بديلاً أفضل)

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
  const isEmbed = event.queryStringParameters?.embed === '1';

  if (!shareUrl) {
    return { statusCode: 400, body: 'Missing URL' };
  }

  try {
    // استخدام API عام (قد يتوقف لكنه يعمل حالياً)
    const apiUrl = `https://terabox.axfg.workers.dev/api?url=${encodeURIComponent(shareUrl)}`;
    console.log(`Calling API: ${apiUrl}`);
    
    const apiRes = await fetch(apiUrl);
    const data = await apiRes.json();

    if (!data.success || !data.files || data.files.length === 0) {
      throw new Error('API returned no data');
    }

    const videoUrl = data.files[0].streaming_url || data.files[0].download_url;
    if (!videoUrl) throw new Error('No video URL');

    console.log(`Found video URL: ${videoUrl.substring(0, 100)}...`);

    if (isEmbed) {
      // صفحة بسيطة للفيديو
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Video Player</title>
  <style>
    * { margin: 0; padding: 0; }
    body { background: #000; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    video { width: 100%; height: auto; max-height: 100vh; }
  </style>
</head>
<body>
  <video controls autoplay>
    <source src="${videoUrl}" type="video/mp4">
  </video>
  <script>document.querySelector('video')?.play().catch(e=>console.log(e));</script>
</body>
</html>`;
      
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html', 'X-Frame-Options': 'ALLOWALL' },
        body: html,
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, video_url: videoUrl }),
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
