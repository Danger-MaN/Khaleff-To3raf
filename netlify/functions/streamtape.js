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
  const videoUrlOrId = params?.url;

  if (!videoUrlOrId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Missing video URL or ID' }),
    };
  }

  try {
    // استخراج File ID من الرابط
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

    // استخدام الخدمة الخارجية التي تدعم التقديم والتأخير
    const directVideoUrl = `https://api.streamtape.best/streamtape?url=https://streamtape.com/v/${fileId}`;
    console.log(`Generated streaming URL for file: ${fileId}`);

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
