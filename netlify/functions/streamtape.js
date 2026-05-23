exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
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

    if (isDirectRequest) {
      console.log(`Proxying video...`);
      const videoRes = await fetch(directVideoUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });

      if (!videoRes.ok) throw new Error(`HTTP ${videoRes.status}`);

      const buffer = await videoRes.arrayBuffer();
      console.log(`Video size: ${buffer.byteLength} bytes`);

      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': videoRes.headers.get('content-type') || 'video/mp4',
          'Content-Disposition': 'inline',
        },
        body: Buffer.from(buffer).toString('base64'),
        isBase64Encoded: true,
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, direct_url: directVideoUrl }),
    };
  } catch (err) {
    console.error('Streamtape error:', err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: err.message }),
    };
  }
};
