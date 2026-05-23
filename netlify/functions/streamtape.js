exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Range',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  const params = event.queryStringParameters;
  const videoUrlOrId = params?.url;
  const isDirectRequest = params?.direct === '1';

  if (!videoUrlOrId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Missing video URL or ID' }),
    };
  }

  const apiLogin = process.env.STREAMTAPE_API_LOGIN;
  const apiKey = process.env.STREAMTAPE_API_KEY;

  if (!apiLogin || !apiKey) {
    console.error('Streamtape API credentials missing');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server configuration error' }),
    };
  }

  try {
    // استخراج File ID
    let fileId = null;
    if (videoUrlOrId.includes('streamtape.com/v/')) {
      const match = videoUrlOrId.match(/streamtape\.com\/v\/([a-zA-Z0-9]+)/);
      if (match && match[1]) fileId = match[1];
    } else {
      fileId = videoUrlOrId;
    }

    if (!fileId) {
      throw new Error('Invalid Streamtape URL or ID');
    }

    console.log(`Processing file ID: ${fileId}`);

    // طلب تذكرة التحميل
    const ticketUrl = `https://api.streamtape.com/file/dlticket?file=${fileId}&login=${apiLogin}&key=${apiKey}`;
    const ticketRes = await fetch(ticketUrl);
    const ticketData = await ticketRes.json();

    if (ticketData.status !== 200 || !ticketData.result?.ticket) {
      throw new Error(ticketData.msg || 'Failed to get download ticket');
    }

    const { ticket, wait_time = 0 } = ticketData.result;
    console.log(`Ticket obtained, wait_time: ${wait_time}`);

    if (wait_time > 0) {
      await new Promise(resolve => setTimeout(resolve, wait_time * 1000));
    }

    // طلب رابط التحميل
    const dlUrl = `https://api.streamtape.com/file/dl?file=${fileId}&ticket=${ticket}`;
    const dlRes = await fetch(dlUrl);
    const dlData = await dlRes.json();

    if (dlData.status !== 200 || !dlData.result?.url) {
      throw new Error(dlData.msg || 'Failed to get download link');
    }

    const directVideoUrl = dlData.result.url;
    console.log(`Direct URL obtained`);

    if (!isDirectRequest) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, direct_url: directVideoUrl }),
      };
    }

    console.log(`Proxying video with caching and range support...`);
    
    const rangeHeader = event.headers.range || event.headers.Range;
    const requestHeaders = { 'User-Agent': 'Mozilla/5.0' };
    if (rangeHeader) {
      requestHeaders['Range'] = rangeHeader;
      console.log(`Range header: ${rangeHeader}`);
    }

    const videoRes = await fetch(directVideoUrl, { headers: requestHeaders });

    if (!videoRes.ok && videoRes.status !== 206) {
      throw new Error(`Failed to fetch video: ${videoRes.status}`);
    }

    const buffer = await videoRes.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    // رؤوس التخزين المؤقت (Caching)
    // تخزين الفيديو لمدة 7 أيام في المتصفح
    const cacheMaxAge = 60 * 60 * 24 * 7; // 7 أيام بالثواني
    
    const responseHeaders = {
      ...headers,
      'Content-Type': videoRes.headers.get('content-type') || 'video/mp4',
      'Content-Disposition': 'inline',
      'Accept-Ranges': 'bytes',
      'Cache-Control': `public, max-age=${cacheMaxAge}, immutable`,
      'ETag': `"${fileId}-${Date.now()}"`, // علامة فريدة للملف
      'Vary': 'Accept-Encoding',
    };

    // إذا كان هناك رد جزئي (206 Partial Content)
    if (videoRes.status === 206) {
      responseHeaders['Content-Range'] = videoRes.headers.get('content-range');
      responseHeaders['Content-Length'] = videoRes.headers.get('content-length');
      
      return {
        statusCode: 206,
        headers: responseHeaders,
        body: base64,
        isBase64Encoded: true,
      };
    }

    // رد كامل (200 OK)
    responseHeaders['Content-Length'] = buffer.byteLength;
    return {
      statusCode: 200,
      headers: responseHeaders,
      body: base64,
      isBase64Encoded: true,
    };
  } catch (err) {
    console.error('Streamtape error:', err.message);
    return {
      statusCode: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: err.message }),
    };
  }
};
